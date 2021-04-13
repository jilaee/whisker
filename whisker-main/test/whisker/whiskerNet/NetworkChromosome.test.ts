import {NetworkChromosomeGeneratorSparse} from "../../../src/whisker/whiskerNet/NetworkGenerators/NetworkChromosomeGeneratorSparse";
import {NeatMutation} from "../../../src/whisker/whiskerNet/NeatMutation";
import {NeatCrossover} from "../../../src/whisker/whiskerNet/NeatCrossover";
import {ConnectionGene} from "../../../src/whisker/whiskerNet/ConnectionGene";
import {NodeGene} from "../../../src/whisker/whiskerNet/NetworkNodes/NodeGene";
import {NetworkChromosome} from "../../../src/whisker/whiskerNet/NetworkChromosome";
import {Mutation} from "../../../src/whisker/search/Mutation";
import {Crossover} from "../../../src/whisker/search/Crossover";
import {List} from "../../../src/whisker/utils/List";
import {ActivationFunction} from "../../../src/whisker/whiskerNet/NetworkNodes/ActivationFunction";
import {HiddenNode} from "../../../src/whisker/whiskerNet/NetworkNodes/HiddenNode";
import {InputNode} from "../../../src/whisker/whiskerNet/NetworkNodes/InputNode";
import {BiasNode} from "../../../src/whisker/whiskerNet/NetworkNodes/BiasNode";
import {ClassificationNode} from "../../../src/whisker/whiskerNet/NetworkNodes/ClassificationNode";
import {RegressionNode} from "../../../src/whisker/whiskerNet/NetworkNodes/RegressionNode";
import {NeuroevolutionUtil} from "../../../src/whisker/whiskerNet/NeuroevolutionUtil";
import {Species} from "../../../src/whisker/whiskerNet/Species";
import {NeuroevolutionProperties} from "../../../src/whisker/whiskerNet/NeuroevolutionProperties";

describe('Test NetworkChromosome', () => {

    let mutationOp: Mutation<NetworkChromosome>;
    let crossoverOp: Crossover<NetworkChromosome>;
    let genInputs: number[][];
    let outputSize: number;
    let generator: NetworkChromosomeGeneratorSparse;
    let chromosome: NetworkChromosome;
    let properties: NeuroevolutionProperties<NetworkChromosome>;

    beforeEach(() => {
        crossoverOp = new NeatCrossover(0.4);
        mutationOp = new NeatMutation(0.03, 0.1,
            30, 0.2, 0.01, 0.8,
            1.5, 0.1, 3, 0.1);
        genInputs = [[1, 2, 3, 4, 5, 6]]
        outputSize = 2;
        generator = new NetworkChromosomeGeneratorSparse(mutationOp, crossoverOp, genInputs, outputSize, 0.4, false)
        chromosome = generator.get();
        properties = new NeuroevolutionProperties<NetworkChromosome>(10)
    })

    test('Constructor Test', () => {
        expect(chromosome.allNodes.size()).toBe(genInputs[0].length + 1 + outputSize);
        expect(chromosome.inputNodesSize()).toBe(genInputs[0].length);
        expect(chromosome.outputNodes.size()).toBe(2);
        expect(chromosome.connections.size()).toBe(12);
        expect(chromosome.getCrossoverOperator()).toBe(crossoverOp);
        expect(chromosome.getMutationOperator()).toBe(mutationOp);
        expect(chromosome.networkFitness).toBe(0);
        expect(chromosome.sharedFitness).toBe(0);
        expect(chromosome.species).toBe(null);
        expect(chromosome.isSpeciesChampion).toBe(false);
        expect(chromosome.isPopulationChampion).toBe(false);
        expect(chromosome.hasDeathMark).toBe(false);
        expect(chromosome.expectedOffspring).toBe(0);
        expect(chromosome.numberOffspringPopulationChamp).toBe(0);
        expect(chromosome.trace).toBe(null);
        expect(chromosome.codons.size()).toBe(0);
        expect(chromosome.isRecurrent).toBe(false);
        expect(chromosome.hasRegression).toBe(false);

        expect(chromosome.outputNodes.get(0).incomingConnections.size()).toBe(genInputs[0].length)
    })

    test("Test getter and setter", () => {
        const species = new Species(1, true, properties)

        chromosome.networkFitness = 4;
        chromosome.sharedFitness = 2;
        chromosome.species = species
        chromosome.isSpeciesChampion = true;
        chromosome.isPopulationChampion = true;
        chromosome.hasDeathMark = true;
        chromosome.expectedOffspring = 1;
        chromosome.numberOffspringPopulationChamp = 2;
        chromosome.trace = undefined;
        chromosome.codons.add(1);
        chromosome.isRecurrent = true;
        chromosome.hasRegression = true;

        expect(chromosome.networkFitness).toBe(4)
        expect(chromosome.sharedFitness).toBe(2)
        expect(chromosome.species).toBe(species)
        expect(chromosome.isSpeciesChampion).toBeTruthy()
        expect(chromosome.isPopulationChampion).toBeTruthy()
        expect(chromosome.hasDeathMark).toBeTruthy()
        expect(chromosome.expectedOffspring).toBe(1)
        expect(chromosome.numberOffspringPopulationChamp).toBe(2)
        expect(chromosome.trace).toBe(undefined)
        expect(chromosome.codons.size()).toBe(1)
        expect(chromosome.isRecurrent).toBeTruthy()
        expect(chromosome.hasRegression).toBeTruthy()
        expect(chromosome.getLength()).toBe(1)
    })

    test("Clone Test without hidden Layer", () => {
        chromosome.generateNetwork();
        const clone = chromosome.clone();
        expect(clone.connections.size()).toBe(chromosome.connections.size())
        expect(clone.allNodes.size()).toBe(chromosome.allNodes.size())
        expect(clone.inputNodes.size).toBe(chromosome.inputNodes.size)
        expect(clone.outputNodes.size()).toBe(chromosome.outputNodes.size())
        expect(clone.sharedFitness).toBe(chromosome.sharedFitness)
    })

    test("Clone Test with given gene without hidden Layer", () => {
        const clone = chromosome.cloneWith(chromosome.connections);
        expect(clone.connections.size()).toBe(chromosome.connections.size())
        expect(clone.allNodes.size()).toBe(chromosome.allNodes.size())
        expect(clone.inputNodes.size).toBe(chromosome.inputNodes.size)
        expect(clone.outputNodes.size()).toBe(chromosome.outputNodes.size())
        expect(clone.sharedFitness).toBe(chromosome.sharedFitness)
    })

    test("Clone Test with hidden Layer", () => {
        // Create input Nodes
        const nodes = new List<NodeGene>()
        nodes.add(new InputNode(0,0))
        nodes.add(new InputNode(1,0))
        nodes.add(new BiasNode(2))

        // Create classification Output Nodes
        nodes.add(new ClassificationNode(3, ActivationFunction.SIGMOID))
        nodes.add(new ClassificationNode(4, ActivationFunction.SIGMOID))

        const hiddenNode = new HiddenNode(5, ActivationFunction.SIGMOID)
        const deepHiddenNode = new HiddenNode(6, ActivationFunction.SIGMOID)
        nodes.add(hiddenNode);
        nodes.add(deepHiddenNode);

        // Create Connections
        const connections = new List<ConnectionGene>();
        connections.add(new ConnectionGene(nodes.get(0), nodes.get(3), 0.2, true, 1, false))
        connections.add(new ConnectionGene(nodes.get(0), nodes.get(4), 0.5, false, 2, false))
        connections.add(new ConnectionGene(nodes.get(1), nodes.get(3), 0.2, false, 3, false))
        connections.add(new ConnectionGene(nodes.get(1), nodes.get(4), 1, true, 4, false))
        connections.add(new ConnectionGene(nodes.get(2), nodes.get(3), 0.2, true, 5, false))
        connections.add(new ConnectionGene(nodes.get(2), nodes.get(4), 0.7, true, 6, false))
        connections.add(new ConnectionGene(nodes.get(0), hiddenNode, 0.3, true, 7, false));
        connections.add(new ConnectionGene(hiddenNode, nodes.get(3), 0.7, true, 8, false));
        connections.add(new ConnectionGene(hiddenNode, deepHiddenNode, 0.3, true, 9, false));
        connections.add(new ConnectionGene(deepHiddenNode, hiddenNode, 1, true, 10, true));
        connections.add(new ConnectionGene(deepHiddenNode, nodes.get(4), 1, true, 11, false))


        chromosome = new NetworkChromosome(connections, nodes, mutationOp, crossoverOp)
        chromosome.generateNetwork();
        const clone = chromosome.clone();
        expect(clone.connections.size()).toBe(chromosome.connections.size())
        expect(clone.allNodes.size()).toBe(chromosome.allNodes.size())
        expect(clone.inputNodes.size).toBe(chromosome.inputNodes.size)
        expect(clone.outputNodes.size()).toBe(chromosome.outputNodes.size())
        expect(clone.sharedFitness).toBe(chromosome.sharedFitness)
    })

    test("Clone Test with given gene and hidden Layer", () => {
        // Create input Nodes
        const nodes = new List<NodeGene>()
        nodes.add(new InputNode(0,0))
        nodes.add(new InputNode(1,0))
        nodes.add(new BiasNode(2))

        // Create classification Output Nodes
        nodes.add(new ClassificationNode(3, ActivationFunction.SIGMOID))
        nodes.add(new ClassificationNode(4, ActivationFunction.SIGMOID))

        const hiddenNode = new HiddenNode(5, ActivationFunction.SIGMOID)
        const deepHiddenNode = new HiddenNode(6, ActivationFunction.SIGMOID)
        nodes.add(hiddenNode);
        nodes.add(deepHiddenNode);

        // Create Connections
        const connections = new List<ConnectionGene>();
        connections.add(new ConnectionGene(nodes.get(0), nodes.get(3), 0.2, true, 1, false))
        connections.add(new ConnectionGene(nodes.get(0), nodes.get(4), 0.5, false, 2, false))
        connections.add(new ConnectionGene(nodes.get(1), nodes.get(3), 0.2, false, 3, false))
        connections.add(new ConnectionGene(nodes.get(1), nodes.get(4), 1, true, 4, false))
        connections.add(new ConnectionGene(nodes.get(2), nodes.get(3), 0.2, true, 5, false))
        connections.add(new ConnectionGene(nodes.get(2), nodes.get(4), 0.7, true, 6, false))
        connections.add(new ConnectionGene(nodes.get(0), hiddenNode, 0.3, true, 7, false));
        connections.add(new ConnectionGene(hiddenNode, nodes.get(3), 0.7, true, 8, false));
        connections.add(new ConnectionGene(hiddenNode, deepHiddenNode, 0.3, true, 9, false));
        connections.add(new ConnectionGene(deepHiddenNode, hiddenNode, 1, true, 10, true));
        connections.add(new ConnectionGene(deepHiddenNode, nodes.get(4), 1, true, 11, false))


        chromosome = new NetworkChromosome(connections, nodes, mutationOp, crossoverOp)
        chromosome.generateNetwork();
        const clone = chromosome.cloneWith(chromosome.connections);
        expect(clone.connections.size()).toBe(chromosome.connections.size())
        expect(clone.allNodes.size()).toBe(chromosome.allNodes.size())
        expect(clone.outputNodes.size()).toBe(chromosome.outputNodes.size())
        expect(clone.inputNodes.size).toBe(chromosome.inputNodes.size)
        expect(clone.sharedFitness).toBe(chromosome.sharedFitness)
    })

    test("Test add inputNode with new Sprite", () =>{
        genInputs.push([1,2,3])
        chromosome.addInputNode(genInputs)
        chromosome.activateNetwork([[1,2],[3]])
        expect(chromosome.inputNodesSize()).toBe(9)
    })

    test("Test add inputNode with additional information gathered from an already existing sprite", () =>{
        genInputs[0].push(11)
        chromosome.addInputNode(genInputs)
        expect(chromosome.inputNodesSize()).toBe(7)
    })

    test('Test generateNetwork with hidden Layer', () => {
        const inputNode = chromosome.inputNodes.get(0).get(0)
        const outputNode = chromosome.outputNodes.get(0)
        const hiddenNode = new HiddenNode(7, ActivationFunction.SIGMOID)
        const deepHiddenNode = new HiddenNode(8, ActivationFunction.SIGMOID)
        chromosome.allNodes.add(hiddenNode);
        chromosome.allNodes.add(deepHiddenNode);
        chromosome.connections.add(new ConnectionGene(inputNode, hiddenNode, 0.5, true, 7, false))
        chromosome.connections.add(new ConnectionGene(hiddenNode, outputNode, 0, true, 8, false))
        chromosome.connections.add(new ConnectionGene(hiddenNode, deepHiddenNode, 1, true, 9, false))
        chromosome.connections.add(new ConnectionGene(deepHiddenNode, outputNode, 0.2, true, 10, false))
        chromosome.generateNetwork()
        // add +1 to the input Nodes due to the Bias Node
        expect(chromosome.allNodes.size()).toBe(6 + 1 + outputSize + 2)
        expect(hiddenNode.incomingConnections.size()).toBe(1)
        expect(deepHiddenNode.incomingConnections.size()).toBe(1)
    })

    test('Test stabilizedCounter without hidden Layer', () => {
        const nodes = new List<NodeGene>()
        nodes.add(new InputNode(0,0))
        nodes.add(new InputNode(1,0))
        nodes.add(new BiasNode(2))

        // Create classification Output Nodes
        nodes.add(new ClassificationNode(3, ActivationFunction.SIGMOID))
        nodes.add(new ClassificationNode(4, ActivationFunction.SIGMOID))

        // Create Connections
        const connections = new List<ConnectionGene>();
        connections.add(new ConnectionGene(nodes.get(0), nodes.get(3), 0.2, true, 1, false))
        connections.add(new ConnectionGene(nodes.get(0), nodes.get(4), 0.5, false, 2, false))
        connections.add(new ConnectionGene(nodes.get(1), nodes.get(3), 0.2, false, 3, false))
        connections.add(new ConnectionGene(nodes.get(1), nodes.get(4), 1, true, 4, false))
        connections.add(new ConnectionGene(nodes.get(2), nodes.get(3), 0.2, true, 5, false))
        connections.add(new ConnectionGene(nodes.get(2), nodes.get(4), 0.7, true, 6, false))

        chromosome = new NetworkChromosome(connections, nodes, mutationOp, crossoverOp)
        const counter = chromosome.stabilizedCounter(5);
        expect(counter).toBe(2);
    })

    test('Test stabilizedCounter with hidden Layer', () => {
        const nodes = new List<NodeGene>()
        nodes.add(new InputNode(0,0))
        nodes.add(new InputNode(1,0))
        nodes.add(new BiasNode(2))

        // Create classification Output Nodes
        nodes.add(new ClassificationNode(3, ActivationFunction.SIGMOID))
        nodes.add(new ClassificationNode(4, ActivationFunction.SIGMOID))

        const hiddenNode = new HiddenNode(5, ActivationFunction.SIGMOID)
        const deepHiddenNode = new HiddenNode(6, ActivationFunction.SIGMOID)
        nodes.add(hiddenNode);
        nodes.add(deepHiddenNode);

        // Create Connections
        const connections = new List<ConnectionGene>();
        connections.add(new ConnectionGene(nodes.get(0), nodes.get(3), 0.2, true, 1, false))
        connections.add(new ConnectionGene(nodes.get(0), nodes.get(4), 0.5, false, 2, false))
        connections.add(new ConnectionGene(nodes.get(1), nodes.get(3), 0.2, false, 3, false))
        connections.add(new ConnectionGene(nodes.get(1), nodes.get(4), 1, true, 4, false))
        connections.add(new ConnectionGene(nodes.get(2), nodes.get(3), 0.2, true, 5, false))
        connections.add(new ConnectionGene(nodes.get(2), nodes.get(4), 0.7, true, 6, false))
        connections.add(new ConnectionGene(nodes.get(0), hiddenNode, 0.3, true, 7, false));
        connections.add(new ConnectionGene(hiddenNode, nodes.get(3), 0.7, true, 8, false));
        connections.add(new ConnectionGene(hiddenNode, deepHiddenNode, 0.3, true, 9, false));
        connections.add(new ConnectionGene(deepHiddenNode, nodes.get(4), 1, true, 10, false))


        chromosome = new NetworkChromosome(connections, nodes, mutationOp, crossoverOp)
        const counter = chromosome.stabilizedCounter(5);
        expect(counter).toBe(4);
    })

    test('Test stabilizedCounter with unstable network', () => {
        const nodes = new List<NodeGene>()
        nodes.add(new InputNode(0,0))
        nodes.add(new InputNode(1,0))
        nodes.add(new BiasNode(2))

        // Create classification Output Nodes
        nodes.add(new ClassificationNode(3, ActivationFunction.SIGMOID))
        nodes.add(new ClassificationNode(4, ActivationFunction.SIGMOID))

        // Create Connections
        const connections = new List<ConnectionGene>();
        connections.add(new ConnectionGene(nodes.get(0), nodes.get(3), 0.2, false, 1, false))
        connections.add(new ConnectionGene(nodes.get(0), nodes.get(4), 0.5, false, 2, false))
        connections.add(new ConnectionGene(nodes.get(1), nodes.get(3), 0.2, false, 3, false))
        connections.add(new ConnectionGene(nodes.get(1), nodes.get(4), 1, false, 4, false))
        connections.add(new ConnectionGene(nodes.get(2), nodes.get(3), 0.2, false, 5, false))
        connections.add(new ConnectionGene(nodes.get(2), nodes.get(4), 0.7, false, 6, false))

        chromosome = new NetworkChromosome(connections, nodes, mutationOp, crossoverOp)
        const counter = chromosome.stabilizedCounter(5);
        expect(counter).toBe(-1);
    })

    test('Network activation without hidden layer', () => {
        // Create input Nodes
        const nodes = new List<NodeGene>()
        nodes.add(new InputNode(0,0))
        nodes.add(new InputNode(1,0))
        nodes.add(new BiasNode(2))

        // Create classification Output Nodes
        nodes.add(new ClassificationNode(3, ActivationFunction.SIGMOID))
        nodes.add(new ClassificationNode(4, ActivationFunction.SIGMOID))


        // Create Connections
        const connections = new List<ConnectionGene>();
        connections.add(new ConnectionGene(nodes.get(0), nodes.get(3), 0.1, true, 1, false))
        connections.add(new ConnectionGene(nodes.get(0), nodes.get(4), 0.2, true, 1, false))
        connections.add(new ConnectionGene(nodes.get(1), nodes.get(3), 0.3, false, 1, false))
        connections.add(new ConnectionGene(nodes.get(1), nodes.get(4), 0.4, false, 1, false))
        connections.add(new ConnectionGene(nodes.get(2), nodes.get(3), 0.5, true, 1, false))
        connections.add(new ConnectionGene(nodes.get(2), nodes.get(4), 0.6, false, 1, false))

        chromosome = new NetworkChromosome(connections, nodes, mutationOp, crossoverOp)
        chromosome.activateNetwork([[1, 2]])
        const softmaxOutput: number[] = NeuroevolutionUtil.softmax(chromosome.outputNodes)
        for (let i = 0; i < softmaxOutput.length; i++) {
            softmaxOutput[i] = Number(softmaxOutput[i].toFixed(3))
        }
        expect(nodes.get(3).nodeValue).toBe(0.6);
        expect(nodes.get(4).nodeValue).toBe(0.2);
        expect(softmaxOutput).toEqual([0.599, 0.401]);
        expect(Math.round(softmaxOutput.reduce((a, b) => a + b))).toBe(1);
    })

    test('Network activation without hidden layer and regression', () => {

        // Create input Nodes
        const nodes = new List<NodeGene>()
        nodes.add(new InputNode(0,0))
        nodes.add(new InputNode(1,0))
        nodes.add(new BiasNode(2))

        // Create classification Output Nodes
        nodes.add(new ClassificationNode(3, ActivationFunction.SIGMOID))
        nodes.add(new ClassificationNode(4, ActivationFunction.SIGMOID))
        nodes.add(new RegressionNode(5));
        nodes.add(new RegressionNode(6));


        // Create Connections
        const connections = new List<ConnectionGene>();
        connections.add(new ConnectionGene(nodes.get(0), nodes.get(3), 0.1, true, 1, false))
        connections.add(new ConnectionGene(nodes.get(0), nodes.get(4), 0.2, true, 1, false))
        connections.add(new ConnectionGene(nodes.get(1), nodes.get(3), 0.3, false, 1, false))
        connections.add(new ConnectionGene(nodes.get(1), nodes.get(4), 0.4, false, 1, false))
        connections.add(new ConnectionGene(nodes.get(2), nodes.get(3), 0.5, true, 1, false))
        connections.add(new ConnectionGene(nodes.get(2), nodes.get(4), 0.6, false, 1, false))
        connections.add(new ConnectionGene(nodes.get(0), nodes.get(5), 0.7, true, 1, false))
        connections.add(new ConnectionGene(nodes.get(0), nodes.get(6), 0.8, true, 1, false))
        connections.add(new ConnectionGene(nodes.get(1), nodes.get(5), 0.9, false, 1, false))
        connections.add(new ConnectionGene(nodes.get(1), nodes.get(6), 1, true, 1, false))


        chromosome = new NetworkChromosome(connections, nodes, mutationOp, crossoverOp)
        chromosome.activateNetwork([[1, 2]])
        const softmaxOutput: number[] = NeuroevolutionUtil.softmax(chromosome.outputNodes)
        for (let i = 0; i < softmaxOutput.length; i++) {
            softmaxOutput[i] = Number(softmaxOutput[i].toFixed(3))
        }
        expect(nodes.get(3).nodeValue).toBe(0.6);
        expect(nodes.get(4).nodeValue).toBe(0.2);
        expect(nodes.get(5).nodeValue).toBe(0.7)
        expect(nodes.get(6).nodeValue).toBe(2.8)
        expect(softmaxOutput).toEqual([0.599, 0.401]);
        expect(Math.round(softmaxOutput.reduce((a, b) => a + b))).toBe(1);
    })

    test('Network activation with hidden layer', () => {

        // Create input Nodes
        const nodes = new List<NodeGene>()
        nodes.add(new InputNode(0,0))
        nodes.add(new InputNode(1,1))
        nodes.add(new BiasNode(2))

        // Create classification Output Nodes
        nodes.add(new ClassificationNode(3, ActivationFunction.SIGMOID))
        nodes.add(new ClassificationNode(4, ActivationFunction.SIGMOID))

        const hiddenNode = new HiddenNode(5, ActivationFunction.SIGMOID)
        const deepHiddenNode = new HiddenNode(6, ActivationFunction.SIGMOID)
        nodes.add(hiddenNode);
        nodes.add(deepHiddenNode);

        // Create Connections
        const connections = new List<ConnectionGene>();
        connections.add(new ConnectionGene(nodes.get(0), nodes.get(3), 0.1, true, 1, false))
        connections.add(new ConnectionGene(nodes.get(0), nodes.get(4), 0.2, true, 1, false))
        connections.add(new ConnectionGene(nodes.get(1), nodes.get(3), 0.3, false, 1, false))
        connections.add(new ConnectionGene(nodes.get(1), nodes.get(4), 0.4, false, 1, false))
        connections.add(new ConnectionGene(nodes.get(2), nodes.get(3), 0.5, true, 1, false))
        connections.add(new ConnectionGene(nodes.get(2), nodes.get(4), 0.6, false, 1, false))
        connections.add(new ConnectionGene(nodes.get(1), hiddenNode, 0.7, true, 1, false))
        connections.add(new ConnectionGene(hiddenNode, deepHiddenNode, 0.8, true, 1, false))
        connections.add(new ConnectionGene(deepHiddenNode, nodes.get(4), 0.9, true, 1, false))


        chromosome = new NetworkChromosome(connections, nodes, mutationOp, crossoverOp)
        chromosome.flushNodeValues();
        for (let i = 0; i < 5; i++) {
            chromosome.activateNetwork([[1], [2]]);
        }
        const softmaxOutput: number[] = NeuroevolutionUtil.softmax(chromosome.outputNodes)
        for (let i = 0; i < softmaxOutput.length; i++) {
            softmaxOutput[i] = Number(softmaxOutput[i].toFixed(3))
        }
        expect(hiddenNode.nodeValue).toBe(1.4)
        expect(Number(hiddenNode.activationValue.toFixed(3))).toBe(0.999)
        expect(Number(deepHiddenNode.nodeValue.toFixed(3))).toBe(0.799)
        expect(Number(deepHiddenNode.activationValue.toFixed(3))).toBe(0.980)
        expect(Number(nodes.get(4).nodeValue.toFixed(3))).toBe(1.082)
        expect(nodes.get(3).nodeValue).toBe(0.6)
        expect(softmaxOutput).toEqual([0.382, 0.618]);
        expect(Math.round(softmaxOutput.reduce((a, b) => a + b))).toBe(1);
    })

    test('Network activation with recurrent connections', () => {

        // Create input Nodes
        const nodes = new List<NodeGene>()
        nodes.add(new InputNode(0,0))
        nodes.add(new InputNode(1,0))
        nodes.add(new BiasNode(2))

        // Create classification Output Nodes
        nodes.add(new ClassificationNode(3, ActivationFunction.SIGMOID))
        nodes.add(new ClassificationNode(4, ActivationFunction.SIGMOID))

        const hiddenNode = new HiddenNode(5, ActivationFunction.SIGMOID)
        const deepHiddenNode = new HiddenNode(6, ActivationFunction.SIGMOID)
        nodes.add(hiddenNode);
        nodes.add(deepHiddenNode);

        // Create Connections
        const connections = new List<ConnectionGene>();
        connections.add(new ConnectionGene(nodes.get(0), nodes.get(3), 0.1, true, 1, false))
        connections.add(new ConnectionGene(nodes.get(0), nodes.get(4), 0.2, true, 1, false))
        connections.add(new ConnectionGene(nodes.get(1), nodes.get(3), 0.3, false, 1, false))
        connections.add(new ConnectionGene(nodes.get(1), nodes.get(4), 0.4, false, 1, false))
        connections.add(new ConnectionGene(nodes.get(2), nodes.get(3), 0.5, true, 1, false))
        connections.add(new ConnectionGene(nodes.get(2), nodes.get(4), 0.6, false, 1, false))
        connections.add(new ConnectionGene(nodes.get(1), hiddenNode, 0.7, true, 1, false))
        connections.add(new ConnectionGene(hiddenNode, deepHiddenNode, 0.8, true, 1, false))
        connections.add(new ConnectionGene(deepHiddenNode, hiddenNode, 1, true, 1, true))
        connections.add(new ConnectionGene(deepHiddenNode, nodes.get(4), 0.9, true, 1, false))


        chromosome = new NetworkChromosome(connections, nodes, mutationOp, crossoverOp)
        chromosome.activateNetwork([[1, 2]])
        const stabilizeCount = chromosome.stabilizedCounter(30);
        for (let i = 0; i < stabilizeCount + 1; i++) {
            chromosome.activateNetwork([[1, 2]])
        }
        const firstOutput = NeuroevolutionUtil.softmax(chromosome.outputNodes)
        // New input has to propagate through network.
        chromosome.activateNetwork([[1, 4]])
        const secondOutput = NeuroevolutionUtil.softmax(chromosome.outputNodes)
        chromosome.activateNetwork([[1, 4]])
        chromosome.activateNetwork([[1, 4]])
        const thirdOutput = NeuroevolutionUtil.softmax(chromosome.outputNodes)
        expect(firstOutput).toEqual(secondOutput)
        expect(firstOutput).not.toEqual(thirdOutput)
        expect(Math.round(firstOutput.reduce((a, b) => a + b))).toBe(1);
        expect(Math.round(secondOutput.reduce((a, b) => a + b))).toBe(1);
        expect(Math.round(thirdOutput.reduce((a, b) => a + b))).toBe(1);
    })

    test("Test the recurrent Network check", () => {
        // Create input Nodes
        const nodes = new List<NodeGene>()
        nodes.add(new InputNode(0,0))
        nodes.add(new InputNode(1,0))
        nodes.add(new BiasNode(2))

        // Create classification Output Nodes
        nodes.add(new ClassificationNode(3, ActivationFunction.SIGMOID))
        nodes.add(new ClassificationNode(4, ActivationFunction.SIGMOID))

        const hiddenNode = new HiddenNode(5, ActivationFunction.SIGMOID)
        const deepHiddenNode = new HiddenNode(6, ActivationFunction.SIGMOID)
        nodes.add(hiddenNode);
        nodes.add(deepHiddenNode);

        // Create Connections
        const connections = new List<ConnectionGene>();
        connections.add(new ConnectionGene(nodes.get(0), nodes.get(3), 0.2, true, 1, false))
        connections.add(new ConnectionGene(nodes.get(0), nodes.get(4), 0.5, false, 2, false))
        connections.add(new ConnectionGene(nodes.get(1), nodes.get(3), 0.2, false, 3, false))
        connections.add(new ConnectionGene(nodes.get(1), nodes.get(4), 1, true, 4, false))
        connections.add(new ConnectionGene(nodes.get(2), nodes.get(3), 0.2, true, 5, false))
        connections.add(new ConnectionGene(nodes.get(2), nodes.get(4), 0.7, true, 6, false))
        connections.add(new ConnectionGene(nodes.get(0), hiddenNode, 0.3, true, 7, false));
        connections.add(new ConnectionGene(hiddenNode, nodes.get(3), 0.7, true, 8, false));
        connections.add(new ConnectionGene(hiddenNode, deepHiddenNode, 0.3, true, 9, false));
        connections.add(new ConnectionGene(deepHiddenNode, hiddenNode, 1, true, 10, true));
        connections.add(new ConnectionGene(deepHiddenNode, nodes.get(4), 1, true, 11, false))
        connections.add(new ConnectionGene(deepHiddenNode, deepHiddenNode, 1, true, 12, true));
        connections.add(new ConnectionGene(nodes.get(4), deepHiddenNode, 1, true, 13, true))


        chromosome = new NetworkChromosome(connections, nodes, mutationOp, crossoverOp);
        const threshold = chromosome.allNodes.size() * chromosome.allNodes.size()
        expect(chromosome.isRecurrentPath(deepHiddenNode, hiddenNode, 0, threshold)).toBeTruthy()
        expect(chromosome.isRecurrentPath(deepHiddenNode, deepHiddenNode, 0, threshold)).toBeTruthy()
        expect(chromosome.isRecurrentPath(hiddenNode, deepHiddenNode, 0, threshold)).toBeFalsy()
        expect(chromosome.isRecurrentPath(nodes.get(4), deepHiddenNode, 0, threshold)).toBeTruthy();
        expect(chromosome.isRecurrentPath(nodes.get(0), nodes.get(3), 0, threshold)).toBeFalsy();
        expect(chromosome.isRecurrentPath(nodes.get(3), nodes.get(0), 0, threshold)).toBeTruthy();
        expect(chromosome.isRecurrentPath(nodes.get(0), nodes.get(1), 0, threshold)).toBeFalsy()
    })

    test("Test toString", () => {
        expect(chromosome.toString()).toContain("Genome:\nNodeGenes: "
            + chromosome.allNodes + "\nConnectionGenes: " + chromosome.connections)
    })
})