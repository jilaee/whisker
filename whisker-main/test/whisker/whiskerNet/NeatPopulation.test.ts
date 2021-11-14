import {NeatPopulation} from "../../../src/whisker/whiskerNet/NeuroevolutionPopulations/NeatPopulation";
import {Randomness} from "../../../src/whisker/utils/Randomness";
import {WaitEvent} from "../../../src/whisker/testcase/events/WaitEvent";
import {MouseMoveEvent} from "../../../src/whisker/testcase/events/MouseMoveEvent";
import {KeyPressEvent} from "../../../src/whisker/testcase/events/KeyPressEvent";
import {NeatChromosomeGeneratorSparse} from "../../../src/whisker/whiskerNet/NetworkGenerators/NeatChromosomeGeneratorSparse";
import {NeatProperties} from "../../../src/whisker/whiskerNet/NeatProperties";
import Arrays from "../../../src/whisker/utils/Arrays";
import {InputNode} from "../../../src/whisker/whiskerNet/NetworkComponents/InputNode";
import {ClassificationNode} from "../../../src/whisker/whiskerNet/NetworkComponents/ClassificationNode";
import {ActivationFunction} from "../../../src/whisker/whiskerNet/NetworkComponents/ActivationFunction";
import {NodeGene} from "../../../src/whisker/whiskerNet/NetworkComponents/NodeGene";
import {ConnectionGene} from "../../../src/whisker/whiskerNet/NetworkComponents/ConnectionGene";
import {NeatChromosome} from "../../../src/whisker/whiskerNet/Networks/NeatChromosome";
import {NeatMutation} from "../../../src/whisker/whiskerNet/Operators/NeatMutation";
import {NeatCrossover} from "../../../src/whisker/whiskerNet/Operators/NeatCrossover";

describe("Test NeatPopulation", () => {

    let size: number;
    let numberOfSpecies: number;
    let population: NeatPopulation;
    let random: Randomness;
    let properties: NeatProperties;
    let chromosomeGenerator: NeatChromosomeGeneratorSparse;
    let mutation: NeatMutation;
    let crossover: NeatCrossover;


    beforeEach(() => {
        size = 10;
        numberOfSpecies = 5;
        const crossoverConfig = {
            "operator": "neatCrossover",
            "crossoverWithoutMutation": 0.2,
            "interspeciesRate": 0.001,
            "weightAverageRate": 0.4
        };

        const mutationConfig = {
            "operator": "neatMutation",
            "mutationWithoutCrossover": 0.25,
            "mutationAddConnection": 0.2,
            "recurrentConnection": 0.1,
            "addConnectionTries": 20,
            "populationChampionNumberOffspring": 10,
            "populationChampionNumberClones": 5,
            "populationChampionConnectionMutation": 0.3,
            "mutationAddNode": 0.1,
            "mutateWeights": 0.6,
            "perturbationPower": 2.5,
            "mutateToggleEnableConnection": 0.1,
            "toggleEnableConnectionTimes": 3,
            "mutateEnableConnection": 0.03
        };
        const genInputs = new Map<string, Map<string, number>>();
        const sprite1 = new Map<string, number>();
        sprite1.set("X-Position", 1);
        sprite1.set("Y-Position", 2);
        sprite1.set("Costume", 3);
        sprite1.set("DistanceToSprite2-X", 4);
        sprite1.set("DistanceToSprite2-y", 5);
        genInputs.set("Sprite1", sprite1);
        const events = [new WaitEvent(), new KeyPressEvent("left arrow", 1),
            new KeyPressEvent("right arrow", 1), new MouseMoveEvent()];
        chromosomeGenerator = new NeatChromosomeGeneratorSparse(mutationConfig, crossoverConfig, genInputs, events, 0.4);
        properties = new NeatProperties(size);
        properties.disjointCoefficient = 1;
        properties.excessCoefficient = 1;
        properties.weightCoefficient = 0.3;
        properties.distanceThreshold = 3;
        properties.penalizingAge = 10;
        properties.ageSignificance = 1.0
        properties.parentsPerSpecies = 0.2
        properties.mutationWithoutCrossover = 0.3
        properties.interspeciesMating = 0.1;
        properties.numberOfSpecies = 5;
        population = new NeatPopulation(chromosomeGenerator, properties);
        population.generatePopulation();
        random = Randomness.getInstance();
        mutation = new NeatMutation(mutationConfig);
        crossover = new NeatCrossover(crossoverConfig);
        for (const c of population.networks) {
            c.fitness = random.nextInt(1, 50);
        }
    })

    test("Test Constructor", () => {
        expect(population.speciesCount).toBeGreaterThan(0);
        expect(population.highestFitness).toBe(0);
        expect(population.highestFitnessLastChanged).toBe(0);
        expect(population.numberOfSpeciesTargeted).toBe(numberOfSpecies);
        expect(population.generator).toBeInstanceOf(NeatChromosomeGeneratorSparse);
        expect(population.populationSize).toBe(size);
        expect(population.generation).toBe(0);
        expect(population.species.length).toBeGreaterThan(0);
        expect(population.networks.length).toBe(size);
        expect(population.hyperParameter).toBeInstanceOf(NeatProperties);
        expect(population.averageFitness).toBe(0);
    })

    test("Test Getter and Setter", () => {

        population.speciesCount = 3;
        population.highestFitness = 3;
        population.highestFitnessLastChanged = 3;
        population.generation = 3;
        population.averageFitness = 3;

        const champ = population.networks[0];
        population.populationChampion = champ;

        expect(population.speciesCount).toBe(3);
        expect(population.highestFitness).toBe(3);
        expect(population.highestFitnessLastChanged).toBe(3);
        expect(population.generation).toBe(3);
        expect(population.averageFitness).toBe(3);
        expect(population.populationChampion).toBe(champ);
    })

    test("Test evolution", () => {
        const oldGeneration = population.networks;
        for (let i = 0; i < 5; i++) {
            for (const c of population.networks)
                c.fitness = random.nextInt(1, 50);
            population.updatePopulationStatistics();
            population.evolve();
        }
        const newGeneration = population.networks;

        expect(oldGeneration).not.toContainEqual(newGeneration);
        expect(population.speciesCount).toBeGreaterThan(0);
        expect(population.generation).toBe(5);
        expect(population.species.length).toBeGreaterThan(0);
        expect(population.networks.length).toBe(size);
    })

    test("Test evolution stagnant population with only one species", () => {
        population.highestFitness = 60;
        population.highestFitnessLastChanged = 100;
        const firstSpecie = population.species[0];
        Arrays.clear(population.species);
        population.species.push(firstSpecie);
        population.updatePopulationStatistics();
        population.evolve();
        expect(population.species.length).toBe(1);
        expect(population.species[0].networks.length).toBe(size);
    })

    test("Test evolve with distance Threshold below 1", () => {
        population.generation = 3;
        population.hyperParameter.distanceThreshold = 0.1;
        population.updatePopulationStatistics();
        population.evolve();
        expect(population.hyperParameter.distanceThreshold).toBe(1);
    })

    test("Test Speciation when a new Population gets created", () => {
        population.generatePopulation();
        expect(population.speciesCount).toBeGreaterThanOrEqual(1);
        expect(population.species.length).toBeGreaterThanOrEqual(1);
    })

    test("Test Speciation when a new Population gets created and a low speciation Threshold", () => {
        properties.distanceThreshold = 0.01;
        population.generatePopulation();
        expect(population.speciesCount).toBeGreaterThanOrEqual(1);
        expect(population.species.length).toBeGreaterThanOrEqual(1);
        expect(population.species.length).toBeLessThanOrEqual(properties.populationSize);
    })

    test("Test Speciation when a new Population gets created and a high speciation Threshold", () => {
        properties.distanceThreshold = 1000;
        population.generatePopulation();
        expect(population.speciesCount).toBeGreaterThanOrEqual(1);
        expect(population.species.length).toBeGreaterThanOrEqual(1);
        expect(population.species.length).toBeLessThanOrEqual(properties.populationSize);
    })

    test("Test Speciation with a chromosome mutated several times", () => {
        const chromosome = chromosomeGenerator.get();
        const mutant = chromosome.cloneStructure(true);
        for (let i = 0; i < 100; i++) {
            mutant.mutate();
            population.speciate(mutant);
        }
        expect(population.speciesCount).toBeGreaterThan(1);
    })

    test("Test Compatibility Distance of clones", () => {
        const chromosome1 = chromosomeGenerator.get();
        const chromosome2 = chromosome1.cloneStructure(false);
        const compatDistance = population.compatibilityDistance(chromosome1, chromosome2);
        expect(compatDistance).toBe(0);
    })

    test("Test Compatibility Distance of Chromosomes with disjoint connections", () => {
        const inputNode1 = new InputNode("Sprite1", "X-Position");
        const inputNode2 = new InputNode("Sprite2", "Y-Position");
        const outputNode = new ClassificationNode(new WaitEvent(), ActivationFunction.SIGMOID);

        const nodes: NodeGene[] = [];
        nodes.push(inputNode1);
        nodes.push(inputNode2);
        nodes.push(outputNode);


        const connection1 = new ConnectionGene(inputNode1, outputNode, 1, true, 0, false);
        const connection2 = new ConnectionGene(inputNode2, outputNode, 0.5, true, 1, false);

        const connections1: ConnectionGene[] = [];
        connections1.push(connection1);

        const connections2: ConnectionGene[] = [];
        connections2.push(connection2);

        const chromosome1 = new NeatChromosome(nodes, connections1, mutation, crossover);
        const chromosome2 = new NeatChromosome(nodes, connections2, mutation, crossover);

        const compatDistance = population.compatibilityDistance(chromosome1, chromosome2);
        expect(compatDistance).toBe(1);
    })

    test("Test Compatibility Distance of Chromosomes with disjoint connections switched", () => {
        const inputNode1 = new InputNode("Sprite1", "X-Position");
        const inputNode2 = new InputNode("Sprite2", "Y-Position");
        const outputNode = new ClassificationNode(new WaitEvent(), ActivationFunction.SIGMOID);

        const nodes: NodeGene[] = []
        nodes.push(inputNode1);
        nodes.push(inputNode2);
        nodes.push(outputNode);


        const connection1 = new ConnectionGene(inputNode1, outputNode, 1, true, 0, false);
        const connection2 = new ConnectionGene(inputNode2, outputNode, 0.5, true, 1, false);

        const connections1: ConnectionGene[] = [];
        connections1.push(connection1);

        const connections2: ConnectionGene[] = [];
        connections2.push(connection2);

        const chromosome1 = new NeatChromosome(nodes, connections2, mutation, crossover);
        const chromosome2 = new NeatChromosome(nodes, connections1, mutation, crossover);

        const compatDistance = population.compatibilityDistance(chromosome1, chromosome2);
        expect(compatDistance).toBe(1)
    })

    test("Test Compatibility Distance of Chromosomes with excess connections", () => {
        const chromosome1 = chromosomeGenerator.get();
        const chromosome2 = chromosome1.cloneStructure(true);

        const node1 = chromosome1.inputNodes.get("Sprite1").get("X-Position");
        const node2 = chromosome1.outputNodes[1];
        chromosome2.connections.push(new ConnectionGene(node1, node2, 1, true, 1000, false));
        const compatDistance = population.compatibilityDistance(chromosome1, chromosome2);
        expect(compatDistance).toBe(1);
    })

    test("Test Compatibility Distance of Chromosomes with same connections but different weights", () => {
        const inputNode1 = new InputNode("Sprite1", "X-Position");
        const inputNode2 = new InputNode("Sprite2", "Y-Position");
        const outputNode = new ClassificationNode(new WaitEvent(), ActivationFunction.SIGMOID);

        const nodes: NodeGene[] = [];
        nodes.push(inputNode1);
        nodes.push(inputNode2);
        nodes.push(outputNode);


        const connection1 = new ConnectionGene(inputNode1, outputNode, 1, true, 0, false);
        const connection2 = new ConnectionGene(inputNode1, outputNode, 0.5, true, 0, false);

        const connections1: ConnectionGene[] = [];
        connections1.push(connection1);

        const connections2: ConnectionGene[] = [];
        connections2.push(connection2);

        const chromosome1 = new NeatChromosome(nodes, connections1, mutation, crossover);
        const chromosome2 = new NeatChromosome(nodes, connections2, mutation, crossover);
        const compatDistance = population.compatibilityDistance(chromosome1, chromosome2);
        expect(compatDistance).toBe(0.3 * 0.5);
    })

    test("Test Compatibility Distance of undefined chromosome", () => {
        const chromosome1 = chromosomeGenerator.get();
        const chromosome2 = undefined;
        const compatDistance = population.compatibilityDistance(chromosome1, chromosome2);
        expect(compatDistance).toBe(Number.MAX_SAFE_INTEGER);
    })

    test("Test Assign innovation number of a new connection", () => {
        const inNode = new InputNode("Sprite3", "X-Position");
        inNode.uID = 100;
        const outNode = new ClassificationNode(new WaitEvent(), ActivationFunction.SIGMOID);
        outNode.uID = 101;
        const newConnection = new ConnectionGene(inNode, outNode, 1, true, 100, false);
        NeatPopulation.assignInnovationNumber(newConnection);
        expect(newConnection.innovation).toBeGreaterThan(0);
    })

    test("Test Assign innovation number of a new connection which is similar to an existing one", () => {
        const chromosome = chromosomeGenerator.get();
        const existingConnection = chromosome.connections[0];
        const existingInode = existingConnection.source as InputNode;
        const existingOnode = existingConnection.target as ClassificationNode;
        const inNode = new InputNode(existingInode.sprite, existingInode.feature);
        inNode.uID = existingInode.uID;
        const outNode = new ClassificationNode(existingOnode.event, existingOnode.activationFunction);
        outNode.uID = existingOnode.uID;
        const newConnection = new ConnectionGene(inNode, outNode, 1, true, 100, false);
        NeatPopulation.assignInnovationNumber(newConnection);
        expect(newConnection.innovation).toBe(existingConnection.innovation);
    })

})
