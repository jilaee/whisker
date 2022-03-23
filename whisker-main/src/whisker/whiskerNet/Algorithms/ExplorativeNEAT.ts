import {NEAT} from "./NEAT";
import {NeatChromosome} from "../Networks/NeatChromosome";
import {StatisticsCollector} from "../../utils/StatisticsCollector";
import {SearchAlgorithmProperties} from "../../search/SearchAlgorithmProperties";
import {NeatProperties} from "../HyperParameter/NeatProperties";
import {NeatPopulation} from "../NeuroevolutionPopulations/NeatPopulation";
import {TargetStatementPopulation} from "../NeuroevolutionPopulations/TargetStatementPopulation";
import {StatementFitnessFunction} from "../../testcase/fitness/StatementFitnessFunction";
import Arrays from "../../utils/Arrays";
import {Randomness} from "../../utils/Randomness";
import {OneOfStoppingCondition} from "../../search/stoppingconditions/OneOfStoppingCondition";
import {OptimalSolutionStoppingCondition} from "../../search/stoppingconditions/OptimalSolutionStoppingCondition";
import {Container} from "../../utils/Container";

export class ExplorativeNEAT extends NEAT {

    /**
     * The population of networks for the current generation.
     */
    private _population: NeatPopulation

    /**
     * Holds the key of the currently targeted statement.
     */
    private _targetKey: number;

    /**
     * Maps statement keys to the corresponding StatementFitnessFunction.
     */
    private _fitnessFunctionMap: Map<number, StatementFitnessFunction>;

    /**
     * Since iterations in explorative NEAT may stop in the middle of a generation due to covering a targeted
     * statement, we use a second variable that counts the number of executed generations since having selected the
     * current target statement.
     */
    private _targetIterations = 0;

    /**
     * Holds a record of promising targets, i.e. the maximum amount of how often a target has accidentally already been
     * covered by a network without it actually being the currently targeted statement.
     */
    private _promisingTargets = new Map<number, number>();

    /**
     * Searches for a suite of networks that are able to cover all statements of a given Scratch program reliably.
     * @returns a Map mapping a statement's key to the network capable of reaching the given statement reliably.
     */
    async findSolution(): Promise<Map<number, NeatChromosome>> {
        this.initialise();
        const totalGoals = this._fitnessFunctions.size;
        while (this._archive.size != totalGoals && !(this._stoppingCondition.isFinished(this))) {
            const currentTarget = this.setNextGoal();
            Container.debugLog(`Next goal ${this._archive.size}/${totalGoals}:${currentTarget}`);
            this._population = this.getPopulation();
            this._population.generatePopulation();
            this._targetIterations = 0;
            while (!this._stoppingCondition.isFinished(this)) {
                await this.evaluateNetworks();
                this.updateBestIndividualAndStatistics();
                if (this._archive.has(this._targetKey)) {
                    Container.debugLog(`Covered Target Statement ${this._targetKey}:${currentTarget}`);
                    break;
                }
                this._population.updatePopulationStatistics();
                this.reportOfCurrentIteration();
                this._population.evolve();
                for (const network of this._population.networks) {
                    network.targetFitness = currentTarget;
                    network.initialiseOpenStatements([...this._fitnessFunctions.values()]);
                }
                this._targetIterations++;
                this._iterations++;
            }
        }
        return this._archive;
    }

    /**
     * Initialises required variables.
     */
    private initialise(): void {
        this._startTime = Date.now();
        this._iterations = 0;
        this._fitnessFunctionMap = new Map(this._fitnessFunctions) as unknown as Map<number, StatementFitnessFunction>;
        for (const fitnessKey of this._fitnessFunctionMap.keys()) {
            this._promisingTargets.set(fitnessKey, 0);
        }
        StatisticsCollector.getInstance().iterationCount = 0;
    }

    /**
     * Sets the next fitness objective by prioritising the most promising statements, i.e. statement that are direct
     * children of already reached statements in the control dependence graph.
     * @returns the next target statement's fitness function.
     */
    private setNextGoal(): StatementFitnessFunction {
        const uncoveredStatements: StatementFitnessFunction[] = [];
        const allStatements = [...this._fitnessFunctionMap.values()];

        // Collect yet uncovered statements.
        for (const [key, statement] of this._fitnessFunctionMap.entries()) {
            if (!this._archive.has(key)) {
                uncoveredStatements.push(statement);
            }
        }

        // Select the next target statement by querying the CDG.
        const potentialTargets = StatementFitnessFunction.getNextUncoveredNodePairs(allStatements, uncoveredStatements);
        let nextTarget: StatementFitnessFunction;
        let currentHighestPotential = 0;

        // Set the next target to be the one with the highest potential.
        for (const potentialTarget of potentialTargets) {

            // ClickGreenFlag should always be prioritised.
            if (potentialTarget.getTargetNode().block.opcode === 'event_whenflagclicked') {
                nextTarget = potentialTarget;
                break;
            }

            // Otherwise, prioritise targets we have already reached in the past.
            const potential = this._promisingTargets.get(this.mapStatementToKey(potentialTarget));
            if (potential > currentHighestPotential) {
                currentHighestPotential = potential;
                nextTarget = potentialTarget;
            }
        }

        // If no target looks promising we pick the next target randomly.
        if (nextTarget === undefined) {
            nextTarget = Randomness.getInstance().pick(Array.from(potentialTargets));
        }
        this._targetKey = this.mapStatementToKey(nextTarget);
        return nextTarget;
    }

    /**
     * Helper function to get the map key of a statement.
     * @param statement the statement whose key should be extracted.
     * @returns the key of the given statement.
     */
    private mapStatementToKey(statement: StatementFitnessFunction): number {
        for (const [key, st] of this._fitnessFunctionMap.entries()) {
            if (st.getTargetNode().id === statement.getTargetNode().id) {
                return key
            }
        }
        return undefined;
    }

    /**
     * Evaluates the networks by letting them play the given Scratch game.
     */
    protected async evaluateNetworks(): Promise<void> {
        for (const network of this._population.networks) {
            // Evaluate the networks by letting them play the game.
            await this._networkFitnessFunction.getFitness(network, this._neuroevolutionProperties.timeout,
                this._neuroevolutionProperties.eventSelection);
            // Update the archive and stop in the middle of the evaluation if we covered the targeted statement,
            // or depleted the search budget.
            this.updateArchive(network);

            // Update the map of the most promising fitness targets
            this.updateMostPromisingMap(network);

            if (this._archive.has(this._targetKey) || this._stoppingCondition.isFinished(this)) {
                return;
            }
        }
    }

    /**
     * Updates the map of the most promising statement targets.
     * @param network the network with which the map will be updated.
     */
    private updateMostPromisingMap(network: NeatChromosome): void {
        for (const fitnessFunctionKey of this._promisingTargets.keys()) {
            const fitnessFunction = this._fitnessFunctions.get(fitnessFunctionKey);
            const networkFitness = network.openStatementTargets.get(fitnessFunction);
            if (this._promisingTargets.has(fitnessFunctionKey) &&
                networkFitness > this._promisingTargets.get(fitnessFunctionKey)) {
                this._promisingTargets.set(fitnessFunctionKey, networkFitness);
            }
        }
    }

    /**
     * Updates the archive of covered block statements. Each chromosome is mapped to the block it covers.
     * @param network The candidate network to update the archive with.
     */
    protected updateArchive(network: NeatChromosome): void {
        for (const fitnessFunctionKey of this._fitnessFunctions.keys()) {
            const fitnessFunction = this._fitnessFunctions.get(fitnessFunctionKey);

            // If we covered a statement update the archive, statistics and the map of open target statements.
            if (this.isCovered(fitnessFunctionKey, network)) {
                Container.debugLog(`Covered Statement ${fitnessFunctionKey}:${fitnessFunction}`);
                StatisticsCollector.getInstance().incrementCoveredFitnessFunctionCount(fitnessFunction);
                this._archive.set(fitnessFunctionKey, network);
                for (const n of this._population.networks) {
                    n.openStatementTargets.delete(fitnessFunction);
                }
                if (this._promisingTargets.has(fitnessFunctionKey)) {
                    this._promisingTargets.delete(fitnessFunctionKey);
                }
            }
        }
        this._bestIndividuals = Arrays.distinctObjects([...this._archive.values()]);
    }

    /**
     * Checks whether a given Scratch statement was as covered in a network's playthrough.
     * @param fitnessFunctionKey the key of the Scratch statement that will be checked if it counts as covered.
     * @param network the chromosome that is evaluated whether it covers the given statement.
     * @returns boolean which is true if the statement was covered.
     */
    private isCovered(fitnessFunctionKey: number, network: NeatChromosome): boolean {
        const fitnessFunction = this._fitnessFunctions.get(fitnessFunctionKey);
        const coverageStableCount = network.openStatementTargets.get(fitnessFunction);
        const statementFitness = fitnessFunction.getFitness(network);
        return (coverageStableCount >= this._neuroevolutionProperties.coverageStableCount &&
                !this._archive.has(fitnessFunctionKey)) ||
            (this._neuroevolutionProperties.coverageStableCount == 0 &&
                fitnessFunction.isOptimal(statementFitness) &&
                !this._archive.has(fitnessFunctionKey));
    }

    /**
     * Reports the current state of the search.
     */
    protected reportOfCurrentIteration(): void {
        Container.debugLog(`Total Iteration: ${StatisticsCollector.getInstance().iterationCount}`)
        Container.debugLog(`Intermediate Iteration:  ${this._targetIterations}`);
        Container.debugLog(`Covered Statements: ${this._archive.size}/${this._fitnessFunctions.size}`)
        Container.debugLog(`Current fitness Target: ${this._fitnessFunctions.get(this._targetKey)}`);
        Container.debugLog(`Best Network Fitness:  ${this._population.bestFitness}`);
        Container.debugLog(`Current Iteration Best Network Fitness:  ${this._population.populationChampion.fitness}`);
        Container.debugLog(`Average Network Fitness: ${this._population.averageFitness}`)
        Container.debugLog(`Generations passed since last improvement: ${this._population.highestFitnessLastChanged}`);
        const sortedSpecies = this._population.species.sort((a, b) => b.averageFitness - a.averageFitness);
        for (const species of sortedSpecies) {
            Container.debugLog(`Species ${species.uID} has ${species.networks.length} members and an average fitness of ${species.averageFitness}`);
        }
        Container.debugLog(`Time passed in seconds: ${(Date.now() - this.getStartTime())}`);
        Container.debugLog("-----------------------------------------------------")
    }

    /**
     * Updates the List of the best networks found so far and the statistics used for reporting. Order is important!
     */
    protected updateBestIndividualAndStatistics(): void {
        this._bestIndividuals = Arrays.distinct(this._archive.values());
        StatisticsCollector.getInstance().bestTestSuiteSize = this._bestIndividuals.length;
        StatisticsCollector.getInstance().iterationCount = this._iterations;
        StatisticsCollector.getInstance().coveredFitnessFunctionsCount = this._archive.size;
        StatisticsCollector.getInstance().updateHighestNetworkFitness(this._archive.size);

        const highestFitness = Math.max(...this._population.networks.map(n => n.fitness));
        const highestScore = Math.max(...this._population.networks.map(n => n.score));
        const highestSurvive = Math.max(...this._population.networks.map(n => n.playTime));
        StatisticsCollector.getInstance().updateHighestScore(highestScore);
        StatisticsCollector.getInstance().updateHighestPlaytime(highestSurvive);

        // Update TimeLine
        const timeLineValues: [number, number, number, number] = [this._archive.size, highestFitness, highestScore,
            highestSurvive];
        StatisticsCollector.getInstance().updateFitnessOverTime(Date.now() - this._startTime, timeLineValues);

        if (this._archive.size == this._fitnessFunctions.size && !this._fullCoverageReached) {
            this._fullCoverageReached = true;
            StatisticsCollector.getInstance().createdTestsToReachFullCoverage =
                (StatisticsCollector.getInstance().iterationCount + 1) * this._neuroevolutionProperties.populationSize;
            StatisticsCollector.getInstance().timeToReachFullCoverage = Date.now() - this._startTime;
        }
    }

    /**
     * Initialises the population for the current fitness target, by cloning and mutating networks saved in the
     * archive since these networks proved to work well and may be trained to reach required advanced states.
     * In case we have not yet covered a single statement, i.e. the archive is empty, we generate a population of
     * networks by querying the defined NetworkGenerator.
     * @returns a population of networks.
     */
    protected getPopulation(): NeatPopulation {
        let startingNetworks: NeatChromosome[];

        // Trivial case, we have not yet covered anything...
        if (this._archive.size === 0) {
            startingNetworks = [];
        }

        // Use existing networks as starting networks if there are any...
        else {
            startingNetworks = Arrays.distinct(this._archive.values());
        }
        const allStatements = [...this._fitnessFunctions.values()];
        const currentTarget = this._fitnessFunctionMap.get(this._targetKey);
        return new TargetStatementPopulation(this._chromosomeGenerator, this._neuroevolutionProperties, allStatements,
            currentTarget, startingNetworks);
    }

    /**
     * Sets the required hyperparameter.
     * @param properties the user-defined hyperparameter.
     */
    setProperties(properties: SearchAlgorithmProperties<NeatChromosome>): void {
        this._neuroevolutionProperties = properties as unknown as NeatProperties;
        this._stoppingCondition = this._neuroevolutionProperties.stoppingCondition;
        if (this._stoppingCondition instanceof OneOfStoppingCondition) {
            for (const condition of this._stoppingCondition.conditions) {
                if (condition instanceof OptimalSolutionStoppingCondition) {
                    Arrays.remove(this._stoppingCondition.conditions, condition);
                }
            }
        }
        this._networkFitnessFunction = this._neuroevolutionProperties.networkFitness;
    }
}
