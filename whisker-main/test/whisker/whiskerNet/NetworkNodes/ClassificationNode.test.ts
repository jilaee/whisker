import {ClassificationNode} from "../../../../src/whisker/whiskerNet/NetworkNodes/ClassificationNode";
import {ActivationFunction} from "../../../../src/whisker/whiskerNet/NetworkNodes/ActivationFunction";
import {NodeType} from "../../../../src/whisker/whiskerNet/NetworkNodes/NodeType";
import {List} from "../../../../src/whisker/utils/List";
import {ConnectionGene} from "../../../../src/whisker/whiskerNet/ConnectionGene";
import {NodeGene} from "../../../../src/whisker/whiskerNet/NetworkNodes/NodeGene";
import {BiasNode} from "../../../../src/whisker/whiskerNet/NetworkNodes/BiasNode";
import {NeuroevolutionUtil} from "../../../../src/whisker/whiskerNet/NeuroevolutionUtil";


describe("classificationNode Tests", () => {
    let classificationNode: NodeGene

    beforeEach(() => {
        classificationNode = new ClassificationNode(1, ActivationFunction.SIGMOID);
    })

    test("Constructor Test", () => {

        const classificationNode = new ClassificationNode(10, ActivationFunction.SIGMOID);

        expect(classificationNode.id).toBe(10);
        expect(classificationNode.activationFunction).toBe(ActivationFunction.SIGMOID);
        expect(classificationNode.type).toBe(NodeType.OUTPUT);
        expect(classificationNode.nodeValue).toBe(0);
        expect(classificationNode.lastActivationValue).toBe(0);
        expect(classificationNode.activationValue).toBe(0)
        expect(classificationNode.activatedFlag).toBe(false)
        expect(classificationNode.activationCount).toBe(0);
        expect(classificationNode.traversed).toBe(false)
        expect(classificationNode.incomingConnections.size()).toBe(0);
    })

    test("Reset Node", () =>{
        classificationNode.activationCount = 10;
        classificationNode.activationValue = 2;
        classificationNode.nodeValue = 10;
        classificationNode.lastActivationValue = 2;
        classificationNode.activatedFlag = true;
        classificationNode.traversed = true;
        classificationNode.reset();
        expect(classificationNode.activationCount).toBe(0)
        expect(classificationNode.activationValue).toBe(0)
        expect(classificationNode.nodeValue).toBe(0)
        expect(classificationNode.lastActivationValue).toBe(0)
        expect(classificationNode.activatedFlag).toBe(false)
        expect(classificationNode.traversed).toBe(false)

    })

    test("Equals Test", () =>{
        const classificationNode2 = new ClassificationNode(1, ActivationFunction.SIGMOID);
        expect(classificationNode2.equals(classificationNode)).toBe(true)

        const classificationNode3 = new ClassificationNode(2, ActivationFunction.SIGMOID);
        expect(classificationNode3.equals(classificationNode)).toBe(false)

        const classificationNode4 = new ClassificationNode(1, ActivationFunction.NONE);
        expect(classificationNode4.equals(classificationNode)).toBe(false)

        const biasNode = new BiasNode(1);
        expect(biasNode.equals(classificationNode)).toBe(false)
    })

    test("Clone Test", () => {
        const clone = classificationNode.clone();
        expect(clone.id).toBe(classificationNode.id);
        expect(clone.equals(classificationNode)).toBe(true);
        expect(clone === classificationNode).toBe(false);
    })

    test("getActivationValue Test", () => {
        classificationNode.nodeValue = 10;
        classificationNode.activationCount = 1;
        const sigmoidResult = NeuroevolutionUtil.sigmoid(10);
        expect(classificationNode.getActivationValue()).toBe(sigmoidResult);
        expect(classificationNode.activationValue).toBe(sigmoidResult)
        classificationNode.reset()
        expect(classificationNode.getActivationValue()).toBe(0);
        expect(classificationNode.activationValue).toBe(0);

        const classificationNode2 = new ClassificationNode(2, ActivationFunction.NONE)
        classificationNode2.nodeValue = 5;
        classificationNode2.activationCount = 10;
        expect(classificationNode2.getActivationValue()).toBe(5);
        expect(classificationNode2.activationValue).toBe(5)
        classificationNode2.reset()
        expect(classificationNode2.getActivationValue()).toBe(0);
        expect(classificationNode2.activationValue).toBe(0);
    })

    test("toString Test", () => {
        const out = classificationNode.toString();
        expect(out).toContain("ClassificationNode{ID: " + 1 + ", Value: " + 0 +
            ", InputConnections: " + new List<ConnectionGene>() + "}")
    })
})