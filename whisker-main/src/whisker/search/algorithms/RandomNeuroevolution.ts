import {List} from '../../utils/List';
import {ChromosomeGenerator} from '../ChromosomeGenerator';
import {NetworkChromosome} from "../../whiskerNet/NetworkChromosome";
import {SearchAlgorithmProperties} from "../SearchAlgorithmProperties";
import {SearchAlgorithmDefault} from "./SearchAlgorithmDefault";
import {FitnessFunction} from "../FitnessFunction";
import {StatisticsCollector} from "../../utils/StatisticsCollector";
import {NeatPopulation} from "../../whiskerNet/NeatPopulation";
import {NeuroevolutionProperties} from "../../whiskerNet/NeuroevolutionProperties";
import {NetworkFitnessFunction} from "../../whiskerNet/NetworkFitness/NetworkFitnessFunction";


export class RandomNeuroevolution<C extends NetworkChromosome> extends SearchAlgorithmDefault<NetworkChromosome> {

    /**
     * The search parameters
     */
    private _neuroevolutionProperties: NeuroevolutionProperties<C>;

    /**
     * The fitnessFunction used to evaluate the networks of Neuroevolution Algorithm.
     */
    private _networkFitnessFunction: NetworkFitnessFunction<NetworkChromosome>;

    /**
     * Evaluates the networks by letting them play the given Scratch game using random event selection.
     * @param networks the networks to evaluate -> Current population
     */
    async evaluateNetworks(networks: List<NetworkChromosome>): Promise<void> {
        for (const network of networks) {
            // Evaluate the networks by letting them play the game.
            await this._networkFitnessFunction.getRandomFitness(network, this._neuroevolutionProperties.timeout);

            // Update the archive and stop if during the evaluation of the population if we already cover all
            // statements.
            this.updateArchive(network);
            if ((this._stoppingCondition.isFinished(this))) {
                return;
            }
        }
    }

    /**
     * Returns a list of solutions for the given problem.
     * @returns Solution for the given problem
     */
    async findSolution(): Promise<Map<number, C>> {
        // The targeted number of species -> The distanceThreshold is adjusted appropriately.
        const speciesNumber = 5;
        // Report the current state of the search after <reportPeriod> iterations.
        const reportPeriod = 1;
        const population = new NeatPopulation(this._neuroevolutionProperties.populationSize, speciesNumber, this._chromosomeGenerator,
            this._neuroevolutionProperties);
        this._iterations = 0;
        this._startTime = Date.now();
        StatisticsCollector.getInstance().startTime = Date.now();

        while (!(this._stoppingCondition.isFinished(this))) {
            await this.evaluateNetworks(population.chromosomes);
            population.evolution();
            this.updateBestIndividualAndStatistics();
            if (this._iterations % reportPeriod === 0)
                this.reportOfCurrentIteration(population);
            this._iterations++;
        }
        return this._archive as Map<number, C>;
    }

    getStartTime(): number {
        return this._startTime;
    }

    /**
     * Updates the List of the best networks found so far and the statistics used for reporting.
     */
    private updateBestIndividualAndStatistics() {
        this._bestIndividuals = new List<C>(Array.from(this._archive.values())).distinct();
        StatisticsCollector.getInstance().bestTestSuiteSize = this._bestIndividuals.size();
        StatisticsCollector.getInstance().incrementIterationCount();
        StatisticsCollector.getInstance().coveredFitnessFunctionsCount = this._archive.size;
        if (this._archive.size == this._fitnessFunctions.size && !this._fullCoverageReached) {
            this._fullCoverageReached = true;
            StatisticsCollector.getInstance().createdTestsToReachFullCoverage =
                (this._iterations + 1) * this._neuroevolutionProperties.populationSize;
            StatisticsCollector.getInstance().timeToReachFullCoverage = Date.now() - this._startTime;
        }
    }

    /**
     * Reports the current state of the search.
     * @param population the population of networks
     */
    private reportOfCurrentIteration(population: NeatPopulation<NetworkChromosome>): void {
        console.log("Iteration: " + this._iterations)
        console.log("Highest fitness last changed: " + population.highestFitnessLastChanged)
        console.log("Highest Network Fitness: " + population.highestFitness)
        console.log("Current Iteration Highest Network Fitness: " + population.populationChampion.networkFitness)
        console.log("Average Fitness: " + population.averageFitness)
        console.log("Population Size: " + population.populationSize())
        console.log("Population Champion: ", population.populationChampion)
        console.log("All Species: ", population.species)
        for (const specie of population.species)
            console.log("Species: " + specie.id + " has a size of " + specie.size())
        console.log("Time passed in seconds: " + (Date.now() - this.getStartTime()))
        console.log("Covered goals: " + this._archive.size + "/" + this._fitnessFunctions.size);
        console.log("-----------------------------------------------------")

        for (const fitnessFunctionKey of this._fitnessFunctions.keys()) {
            if (!this._archive.has(fitnessFunctionKey)) {
                console.log("Not covered: " + this._fitnessFunctions.get(fitnessFunctionKey).toString());
            }
        }
    }

    setChromosomeGenerator(generator: ChromosomeGenerator<C>): void {
        this._chromosomeGenerator = generator;
    }

    setProperties(properties: SearchAlgorithmProperties<C>): void {
        this._neuroevolutionProperties = properties as unknown as NeuroevolutionProperties<C>;
        this._stoppingCondition = this._neuroevolutionProperties.stoppingCondition
        this._networkFitnessFunction = this._neuroevolutionProperties.networkFitness;
    }

    getNumberOfIterations(): number {
        return this._iterations;
    }

    getCurrentSolution(): List<NetworkChromosome> {
        return this._bestIndividuals;
    }

    getFitnessFunctions(): Iterable<FitnessFunction<C>> {
        return this._fitnessFunctions.values();
    }

    setFitnessFunctions(fitnessFunctions: Map<number, FitnessFunction<C>>): void {
        this._fitnessFunctions = fitnessFunctions;
        StatisticsCollector.getInstance().fitnessFunctionCount = fitnessFunctions.size;
    }
}
