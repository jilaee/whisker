import {Mutation} from "../search/Mutation";
import {NeatChromosome} from "./NeatChromosome";
import {NeatParameter} from "./NeatParameter";
import {List} from "../utils/List";
import {NodeGene} from "./NodeGene";
import {ConnectionGene} from "./ConnectionGene";
import {NodeType} from "./NodeType";
import {Randomness} from "../utils/Randomness";
import {ActivationFunctions} from "./ActivationFunctions";


export class NeatMutation implements Mutation<NeatChromosome> {

    public static _innovations = new List<ConnectionGene>();
    private _random = Randomness.getInstance();

    apply(chromosome: NeatChromosome): NeatChromosome {

        // Special treatment for population Champions => either add a Connection or change the weights
        if (chromosome.populationChampion) {
            if (this._random.nextDouble() <= 0.8) {
                this.mutateWeight(chromosome, NeatParameter.MUTATE_WEIGHT_POWER, 1);
            } else {
                this.mutateAddConnection(chromosome, NeatParameter.ADD_CONNECTION_TRIES);
            }
        }

        // If we dont have a population Champion apply either structural mutation or non structural mutation but not both!
        else {
            // Structural mutation
            if (this._random.nextDouble() < NeatParameter.MUTATE_ADD_NODE) {
                this.mutateAddNode(chromosome);
            } else if (this._random.nextDouble() < NeatParameter.MUTATE_ADD_CONNECTION) {
                this.mutateAddConnection(chromosome, NeatParameter.ADD_CONNECTION_TRIES);
            }

            // Non structural mutation
            else {
                if (this._random.nextDouble() < NeatParameter.MUTATE_WEIGHTS)
                    this.mutateWeight(chromosome, NeatParameter.MUTATE_WEIGHT_POWER, 1);
                if (this._random.nextDouble() < NeatParameter.MUTATE_CONNECTION_STATE)
                    this.mutateConnectionState(chromosome, 1);
                if (this._random.nextDouble() < NeatParameter.MUTATE_REENABLE_STATE)
                    this.mutateConnectionReenable(chromosome);
            }
        }
        return chromosome;
    }

    mutateAddConnection(chromosome: NeatChromosome, tries: number): void {

        let rounds = 0;
        let node1: NodeGene;
        let node2: NodeGene;

        // Collect all nodes to which a new connection can point -> all nodes except the input and bias nodes
        const possibleToNodes = new List<NodeGene>();
        for (const node of chromosome.allNodes) {
            if ((node.type !== NodeType.INPUT) && (node.type !== NodeType.BIAS))
                possibleToNodes.add(node);
        }

        // Decide if we want a recurrent Connection
        let recurrentConnection = false;
        if (this._random.nextDouble() < NeatParameter.RECURRENCY_RATE) {
            recurrentConnection = true;
        }

        // Checks if we found a connection to add
        let foundConnection = false;
        while (rounds < tries) {

            // Recurrent connection
            if (recurrentConnection) {
                //Decide between loop and normal recurrency
                let loopRecurrency = false
                if (this._random.nextDouble() > 0.5) {
                    loopRecurrency = true
                }
                // Loop: The node points to itself X -> X
                if (loopRecurrency) {
                    node1 = this._random.pickRandomElementFromList(possibleToNodes);
                    node2 = node1;
                }
                // Normal Recurrency: Y -> X
                else {
                    node1 = this._random.pickRandomElementFromList(chromosome.allNodes);
                    node2 = this._random.pickRandomElementFromList(possibleToNodes);
                }
            }

            // No recurrent connection
            else {
                node1 = this._random.pickRandomElementFromList(chromosome.allNodes);
                node2 = this._random.pickRandomElementFromList(possibleToNodes);
            }

            // Verify if the new connection already exists
            let skip = false;
            for (const connection of chromosome.connections) {

                // Double Check if we dont have a connection pointing to an input or bias Node
                if (node2.type === NodeType.INPUT || node2.type === NodeType.BIAS) {
                    skip = true;
                    break;
                }

                if (connection.from === node1 && connection.to === node2 && connection.recurrent && recurrentConnection) {
                    skip = true;
                    break;
                }

                if (connection.from === node1 && connection.to === node2 && !connection.recurrent && !recurrentConnection) {
                    skip = true;
                    break;
                }
            }

            // We found a valid connection to add
            if (!skip) {
                const threshold = chromosome.allNodes.size() * chromosome.allNodes.size();
                const recurrentNetwork = chromosome.isRecurrentNetwork(node1, node2, 0, threshold)
                if (chromosome.loop) {
                    console.error("Loop Detected during add link Mutation")
                    return;
                }
                if ((!recurrentNetwork && recurrentConnection) || (recurrentNetwork && !recurrentConnection)) {
                    tries++;
                } else {
                    rounds = tries;
                    foundConnection = true;
                }
            }

            if (foundConnection) {
                const posNeg = this._random.randomBoolean() ? +1 : -1;
                const weight = posNeg * this._random.nextDouble() * 10.0;
                const newConnection = new ConnectionGene(node1, node2, weight, true, 0, recurrentConnection);
                this.assignInnovationNumber(newConnection);
                chromosome.connections.add(newConnection);
            }
        }
    }

    mutateAddNode(chromosome: NeatChromosome): void {

        let count = 0;
        let found = false;
        let splitConnection: ConnectionGene;

        // Find a connection which is enabled and not a bias
        while ((count < 20) && (!found)) {
            splitConnection = this._random.pickRandomElementFromList(chromosome.connections);
            if (splitConnection.enabled && (splitConnection.from.type !== NodeType.BIAS))
                found = true;
            count++;
        }

        // If we didnt find a connection do nothing.
        if (!found)
            return;

        // Disable the old connection
        splitConnection.enabled = false;

        // Save the old weight and the nodes of the connection
        const oldWeight = splitConnection.weight;
        const fromNode = splitConnection.from;
        const toNode = splitConnection.to;

        const newNode = new NodeGene(chromosome.allNodes.size(), NodeType.HIDDEN, ActivationFunctions.SIGMOID)

        const newConnection1 = new ConnectionGene(fromNode, newNode, 1, true, 0, splitConnection.recurrent)
        this.assignInnovationNumber(newConnection1);
        newNode.incomingConnections.add(newConnection1);

        const newConnection2 = new ConnectionGene(newNode, toNode, oldWeight, true, 0, false)
        this.assignInnovationNumber(newConnection2);
        toNode.incomingConnections.add(newConnection2);

        chromosome.connections.add(newConnection1);
        chromosome.connections.add(newConnection2);
        chromosome.allNodes.add(newNode);
    }

    public mutateWeight(chromosome: NeatChromosome, power: number, rate: number): void {
        let gaussPoint = 0;
        let coldGaussPoint = 0;

        // Randomly shake things up!
        const severe = this._random.nextDouble() > 0.5;

        const connections = chromosome.connections;
        const connectionsSize = connections.size();
        const endPart = connectionsSize * 0.8;
        const powerMod = 1.0;
        let counter = 0;


        for (const connection of connections) {
            if (severe) {
                gaussPoint = 0.3;
                coldGaussPoint = 0.1;
            } else {

                if (connectionsSize >= 10 && counter > endPart) {
                    gaussPoint = 0.5;
                    coldGaussPoint = 0.3;
                } else {
                    if (this._random.nextDouble() > 0.5) {
                        gaussPoint = 1.0 - rate;
                        coldGaussPoint = 1.0 - rate - 0.1;
                    } else {
                        gaussPoint = 1.0 - rate;
                        coldGaussPoint = 1.0 - rate;
                    }
                }
            }

            const randomPosNegValue = this._random.randomBoolean() ? +1 : -1;
            const weightModification = randomPosNegValue * this._random.nextDouble() * power * powerMod;
            const randomDouble = this._random.nextDouble();
            if (randomDouble > gaussPoint)
                connection.weight += weightModification;
            else if (randomDouble > coldGaussPoint)
                connection.weight = weightModification;
            counter++;
        }

    }


    mutateConnectionState(chromosome: NeatChromosome, times: number): void {
        for (let count = 0; count <= times; count++) {
            // Pick a random connection
            const chosenConnection = this._random.pickRandomElementFromList(chromosome.connections);

            // If we disable a connection, we have to make sure that another connection links out of the in-node
            // in order to not loose a bigger section of the network
            if (chosenConnection.enabled) {
                let save = false;
                for (const otherConnection of chromosome.connections) {
                    if ((otherConnection.from.equals(chosenConnection.from)) && (otherConnection.enabled) &&
                        (chosenConnection.innovation !== otherConnection.innovation)) {
                        save = true;
                        break;
                    }
                }
                if (save)
                    chosenConnection.enabled = false;
            } else
                chosenConnection.enabled = true;
        }
        chromosome.generateNetwork();
        const connections = chromosome.connections;
        // Pick random connection
        const connection = this._random.pickRandomElementFromList(connections);
        // Flip the state
        connection.enabled = !connection.enabled;

        //Check the network and re-enable the connection if by chance we destroyed the network
        while (chromosome.stabilizedCounter(30, true) < 0) {
            connection.enabled = true;
        }
    }

    mutateConnectionReenable(chromosome: NeatChromosome): void {
        for (const connection of chromosome.connections) {
            if (!connection.enabled) {
                connection.enabled = true;
                break;
            }
        }
    }

    private findConnection(connections: List<ConnectionGene>, connection: ConnectionGene): ConnectionGene {
        for (const con of connections) {
            if (con.equalsByNodes(connection)) return con;
        }
        return null;
    }

    private assignInnovationNumber(newInnovation: ConnectionGene): void {
        // Check if innovation already happened in this generation if Yes assign the same innovation number
        const oldInnovation = this.findConnection(NeatMutation._innovations, newInnovation)
        if (oldInnovation !== null)
            newInnovation.innovation = oldInnovation.innovation;
        // If No assign a new one
        else {
            newInnovation.innovation = ConnectionGene.getNextInnovationNumber();
            NeatMutation._innovations.add(newInnovation);
        }
    }
}
