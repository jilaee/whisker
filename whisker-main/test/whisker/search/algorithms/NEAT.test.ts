import {VMWrapperMock} from "../../utils/VMWrapperMock";
import {SearchAlgorithmBuilder} from "../../../../src/whisker/search/SearchAlgorithmBuilder";
import {SearchAlgorithmType} from "../../../../src/whisker/search/algorithms/SearchAlgorithmType";
import {NetworkChromosome} from "../../../../src/whisker/whiskerNet/NetworkChromosome";
import {NeuroevolutionProperties} from "../../../../src/whisker/whiskerNet/NeuroevolutionProperties";
import {SearchAlgorithm} from "../../../../src/whisker/search/SearchAlgorithm";
import {SearchAlgorithmProperties} from "../../../../src/whisker/search/SearchAlgorithmProperties";
import {Chromosome} from "../../../../src/whisker/search/Chromosome";
import {NetworkChromosomeGeneratorSparse} from "../../../../src/whisker/whiskerNet/NetworkGenerators/NetworkChromosomeGeneratorSparse";
import {FixedIterationsStoppingCondition} from "../../../../src/whisker/search/stoppingconditions/FixedIterationsStoppingCondition";
import {NetworkFitnessFunction} from "../../../../src/whisker/whiskerNet/NetworkFitness/NetworkFitnessFunction";
import {Randomness} from "../../../../src/whisker/utils/Randomness";
import {FitnessFunctionType} from "../../../../src/whisker/search/FitnessFunctionType";
import {ScratchEvent} from "../../../../src/whisker/testcase/events/ScratchEvent";
import {List} from "../../../../src/whisker/utils/List";
import {WaitEvent} from "../../../../src/whisker/testcase/events/WaitEvent";
import {MouseMoveEvent} from "../../../../src/whisker/testcase/events/MouseMoveEvent";
import {KeyPressEvent} from "../../../../src/whisker/testcase/events/KeyPressEvent";

describe('Test NEAT', () => {

    let searchAlgorithm: SearchAlgorithm<Chromosome>;
    let generator: NetworkChromosomeGeneratorSparse;
    let properties: NeuroevolutionProperties<NetworkChromosome>;

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

    beforeEach(() => {
        const mock = new VMWrapperMock();
        mock.init()

        const genInputs = new Map<string, Map<string, number>>();
        const sprite1 = new Map<string, number>();
        sprite1.set("X-Position", 1);
        sprite1.set("Y-Position", 2);
        sprite1.set("Costume", 3);
        sprite1.set("DistanceToSprite2-X", 4);
        sprite1.set("DistanceToSprite2-y", 5);
        genInputs.set("Sprite1", sprite1);

        const sprite2 = new Map<string, number>();
        sprite2.set("X-Position", 6);
        sprite2.set("Y-Position", 7);
        sprite2.set("DistanceToWhite-X", 8);
        sprite2.set("DistanceToWhite-Y", 9);
        genInputs.set("Sprite2", sprite2);
        const events = new List<ScratchEvent>([new WaitEvent(), new KeyPressEvent("left arrow", 1),
            new KeyPressEvent("right arrow", 1), new MouseMoveEvent()]);
        generator = new NetworkChromosomeGeneratorSparse(mutationConfig, crossoverConfig, genInputs, events, 0.4);

        const builder = new SearchAlgorithmBuilder(SearchAlgorithmType.NEAT);
        const iterations = 20;
        const populationSize = 150;
        const random = Randomness.getInstance();
        properties = new NeuroevolutionProperties(populationSize);

        properties.networkFitness = new class implements NetworkFitnessFunction<NetworkChromosome> {
            compare(value1: number, value2: number): number {
                return value2 - value1;
            }

            getFitness(network: NetworkChromosome): Promise<number> {
                const fitness = random.nextInt(1, 100);
                network.networkFitness = fitness;
                return Promise.resolve(fitness);
            }

            getFitnessWithoutPlaying(network: NetworkChromosome): number {
                const fitness = random.nextInt(1, 100);
                network.networkFitness = fitness;
                return fitness;
            }

            getRandomFitness(network: NetworkChromosome): Promise<number> {
                const fitness = random.nextInt(1, 100);
                network.networkFitness = fitness;
                return Promise.resolve(fitness);
            }
        }
        properties.stoppingCondition = new FixedIterationsStoppingCondition(iterations);
        properties.timeout = 25000;
        properties.numberOfSpecies = 5;
        properties.parentsPerSpecies = 0.20;
        properties.penalizingAge = 20;
        properties.ageSignificance = 1.0;
        properties.inputRate = 0.3;
        properties.crossoverWithoutMutation = 0.2;
        properties.mutationWithoutCrossover = 0.25;
        properties.mutationAddConnection = 0.05;
        properties.recurrentConnection = 0.1;
        properties.addConnectionTries = 50;
        properties.populationChampionNumberOffspring = 3;
        properties.populationChampionNumberClones = 1;
        properties.populationChampionConnectionMutation = 0.3;
        properties.mutationAddNode = 0.03;
        properties.mutateWeights = 0.6;
        properties.perturbationPower = 2.5;
        properties.mutateToggleEnableConnection = 0.1;
        properties.toggleEnableConnectionTimes = 3;
        properties.mutateEnableConnection = 0.0;
        properties.distanceThreshold = 3.0;
        properties.disjointCoefficient = 1;
        properties.excessCoefficient = 1;
        properties.weightCoefficient = 0.3;
        searchAlgorithm = builder.addProperties(properties as unknown as SearchAlgorithmProperties<Chromosome>)
            .addChromosomeGenerator(generator).initializeFitnessFunction(FitnessFunctionType.STATEMENT, null, null)
            .buildSearchAlgorithm();
    })

    test("Test findSolution()", () => {
        return searchAlgorithm.findSolution().then(() => {
            expect(searchAlgorithm.getNumberOfIterations()).toBe(20);
        });
    })
})
