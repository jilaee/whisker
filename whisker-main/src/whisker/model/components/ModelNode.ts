import TestDriver from "../../../test/test-driver";
import {ModelEdge} from "./ModelEdge";
import ModelResult from "../../../test-runner/model-result";
import {CheckUtility} from "../util/CheckUtility";

/**
 * Node structure for a model.
 */
export class ModelNode {
    readonly id: string;
    edges: ModelEdge[] = []; //outgoing edges

    isStartNode = false;
    isStopNode = false;
    stopAllModels = false;

    /**
     * Node of a graph with an unique id identifier.
     * @param id
     */
    constructor(id: string) {
        this.id = id;
    }

    /**
     * Add an outgoing edge from this model node.
     * @param edge Edge to add.
     */
    addOutgoingEdge(edge: ModelEdge): void {
        this.edges.push(edge);
    }

    /**
     * Returns an model edge if one has its conditions for traversing the edge fulfilled or else null.
     * @param stepsSinceLastTransition Number of steps since the last transition in the model this effect belongs to
     * @param stepsSinceEnd Number of steps since the after run model tests started.
     */
    testEdgeConditions(testDriver: TestDriver, stepsSinceLastTransition: number, stepsSinceEnd: number, modelResult: ModelResult) {
        if (this.edges.length == 0) {
            return null;
        }

        for (let i = 0; i < this.edges.length; i++) {
            const result = this.edges[i].checkConditions(testDriver, stepsSinceLastTransition, stepsSinceEnd, modelResult);

            if (result && result.length == 0) {
                return this.edges[i];
            }
        }

        return null;
    }

    /**
     * Register the check listener and test driver.
     */
    registerComponents(checkListener: CheckUtility, testDriver: TestDriver, result: ModelResult, caseSensitive: boolean) {
        this.edges.forEach(edge => {
            edge.registerComponents(checkListener, testDriver, result, caseSensitive);
        })
    }

    /**
     * Reset all edge's states that belong to one test run.
     */
    reset() {
        this.edges.forEach(edge => {
            edge.reset();
        })
    }

    simplifyForSave() {
        return {
            id: this.id,
            isStartNode: this.isStartNode,
            isStopNode: this.isStopNode,
            stopAllModels: this.stopAllModels
        }
    }
}
