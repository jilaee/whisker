import {NodeGene} from "./NodeGene";
import {ActivationFunction} from "./ActivationFunction";
import {NodeType} from "./NodeType";
import {NeuroevolutionUtil} from "../NeuroevolutionUtil";
import {ScratchEvent} from "../../testcase/events/ScratchEvent";

export class ClassificationNode extends NodeGene {

    /**
     * The ScratchEvent this classification node is representing.
     */
    private readonly _event: ScratchEvent

    /**
     * Constructs a new classification Node.
     * @param activationFunction the activation function of the classification node.
     * @param event the ScratchEvent this Classification node is representing.
     * @param incrementIDCounter flag determining whether the uID counter should be increased after constructing a
     * new classification node.
     */
    constructor(event: ScratchEvent, activationFunction: ActivationFunction, incrementIDCounter = true) {
        super(activationFunction, NodeType.OUTPUT, incrementIDCounter);
        this._event = event;
    }

    equals(other: unknown): boolean {
        if (!(other instanceof ClassificationNode)) return false;
        return this.event.stringIdentifier() === other.event.stringIdentifier() &&
            this.activationFunction === other.activationFunction;
    }

    clone(): ClassificationNode {
        const clone = new ClassificationNode(this.event, this.activationFunction, false);
        clone.uID = this.uID;
        clone.nodeValue = this.nodeValue;
        clone.activationValue = this.activationValue;
        clone.lastActivationValue = this.lastActivationValue;
        clone.activationCount = this.activationCount;
        clone.activatedFlag = this.activatedFlag;
        clone.traversed = this.traversed;
        return clone
    }

    /**
     * Calculates the activation value of the classification node based on the node value and the activation function.
     * @returns number activation value of the classification node.
     */
    getActivationValue(): number {
        if (this.activationCount > 0) {
            switch (this.activationFunction) {
                case ActivationFunction.SIGMOID:
                    // The specified gain value of -4.9 is based on the original NEAT publication.
                    this.activationValue = NeuroevolutionUtil.sigmoid(this.nodeValue, -4.9);
                    break;
                default:
                    this.activationValue = this.nodeValue;
                    break;
            }
            return this.activationValue;
        } else
            return 0.0;
    }

    toString(): string {
        return `ClassificationNode{ID: ${this.uID}\
, Value: ${this.activationValue}\
, InputConnections: ${this.incomingConnections}}`;
    }

    /**
     * Transforms this Classification Node into a JSON representation.
     * @return Record containing most important attributes keys mapped to their values.
     */
    public toJSON(): Record<string, (number | string)> {
        const node = {}
        node[`id`] = this.uID;
        node[`t`] = "C";
        node[`aF`] = ActivationFunction[this.activationFunction];
        node[`event`] = this.event.stringIdentifier();
        return node;
    }

    get event(): ScratchEvent {
        return this._event;
    }
}