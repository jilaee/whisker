import TestDriver from "../../../test/test-driver";
import ModelResult from "../../../test-runner/model-result";
import {Effect} from "../components/Effect";
import {ProgramModelEdge} from "../components/ModelEdge";
import {getEffectFailedOutput, getErrorOnEdgeOutput} from "./ModelError";
import {ProgramModel} from "../components/ProgramModel";
import EventEmitter from "events";

/**
 * For edge condition or effect checks that need to listen to the onMoved of a sprite or keys before a step.
 */
export class CheckUtility extends EventEmitter {
    private readonly testDriver: TestDriver;
    private readonly modelResult: ModelResult;

    static readonly EVENT = "Event"
    private spriteChecks: { [key: string]: ((sprite) => boolean)[] } = {};
    private registeredTouching: string[] = [];
    private registeredColor: string[] = [];
    private eventStrings: string[] = [];

    private effectChecks: { effect: Effect, edge: ProgramModelEdge, model: ProgramModel }[] = [];
    private failedChecks: { effect: Effect, edge: ProgramModelEdge, model: ProgramModel }[] = [];

    /**
     * Get an instance of a condition state saver.
     * @param testDriver Instance of the test driver.
     * @param nbrOfAllModels Number of all models.
     * @param modelResult For saving errors of the model.
     */
    constructor(testDriver: TestDriver, nbrOfAllModels: number, modelResult: ModelResult) {
        super();
        this.testDriver = testDriver;
        this.modelResult = modelResult;
        this.setMaxListeners(nbrOfAllModels);
    }

    /**
     * Register a touching check for a sprite with another sprite. The check is also registered for the
     * other sprite as there have been inconsistencies.
     * @param spriteRegex1 Regex defining the first sprite name to find the same check again.
     * @param spriteRegex2 Regex defining the second sprite name to find the same check again.
     * @param spriteName1 Sprite's name that gets the condition check registered.
     * @param spriteName2 Name of the other sprite that the first needs to touch.
     * @param negated Whether this check is negated.
     */
    registerTouching(spriteRegex1: string, spriteRegex2: string, spriteName1: string, spriteName2: string, negated: boolean): void {
        const touchingString = CheckUtility.getTouchingString(spriteName1, spriteName2, negated);
        const eventString = CheckUtility.getTouchingString(spriteRegex1, spriteRegex2, negated);

        // no check for this sprite till now
        if (this.spriteChecks[spriteName1] == undefined) {
            this.setupModelSpriteMove(spriteName1);
        }

        if (this.registeredTouching.indexOf(touchingString) == -1) {
            this.registeredTouching.push(touchingString);
            this.spriteChecks[spriteName1].push((sprite) => {
                return !negated == sprite.isTouchingSprite(spriteName2) && this.updateEventString(eventString);
            });
        }
    }

    /**
     * Registers a color touching check for a sprite with a RGB color value (as an array).
     * @param spriteRegex Regex defining the first sprite name to find the same check again.
     * @param negated Whether this check is negated
     * @param spriteName Name of the sprite that gets the check.
     * @param r RGB red value.
     * @param g RGB green value.
     * @param b RGB blue value.
     */
    registerColor(spriteRegex: string, spriteName: string, r: number, g: number, b: number, negated: boolean): void {
        const colorString = CheckUtility.getColorString(spriteName, r, g, b, negated);
        const eventString = CheckUtility.getColorString(spriteRegex, r, g, b, negated);

        // no check for this sprite till now
        if (this.spriteChecks[spriteName] == undefined) {
            this.setupModelSpriteMove(spriteName);
        }

        if (this.registeredColor.indexOf(colorString) == -1) {
            this.registeredColor.push(colorString);
            this.spriteChecks[spriteName].push((sprite) => {
                return !negated == sprite.isTouchingColor([r, g, b]) && this.updateEventString(eventString);
            });
        }
    }

    private setupModelSpriteMove(spriteName: string) {
        this.spriteChecks[spriteName] = [];
        this.testDriver.addModelSpriteMoved((sprite) => {
            if (sprite.name == spriteName) {
                let change = false;
                this.spriteChecks[spriteName].forEach(fun => {
                    if (fun(sprite)) {
                        change = true;
                    }
                });
                if (change) {
                    this.emit(CheckUtility.EVENT, this.testDriver, this.eventStrings);
                }
            }
        })
    }

    private updateEventString(event: string): boolean {
        if (this.eventStrings.indexOf(event) != -1) {
            return false;
        }

        if (this.eventStrings.length == 0) {
            this.eventStrings.push(event);
            return true;
        }

        const negated = event.startsWith("!");
        let invertedEvent;

        if (negated) {
            invertedEvent = event.substring(1, event.length);
        } else {
            invertedEvent = "!" + event;
        }

        let newEventString = [];
        // if the event strings array contains the inverted event remove that one
        for (let i = 0; i < this.eventStrings.length; i++) {
            if (this.eventStrings[i] != invertedEvent) {
                newEventString.push(this.eventStrings[i]);
            }
        }
        this.eventStrings = newEventString;
        this.eventStrings.push(event);
        return true;
    }

    reset() {
        this.eventStrings = [];
    }

    /**
     * Check whether a key was pressed at the beginning of the step.
     * @param keyName Name of the key.
     */
    isKeyDown(keyName: string) {
        return this.testDriver.isKeyDown(keyName);
    }

    /**
     * Get the string defining a touching event.
     */
    static getTouchingString(sprite1: string, sprite2: string, negated: boolean): string {
        let s = negated ? "!" : "";
        return s + sprite1 + ":" + sprite2;
    }

    /**
     * Get the string defining a color event.
     */
    static getColorString(spriteName: string, r: number, g: number, b: number, negated): string {
        let s = negated ? "!" : "";
        return s + spriteName + ":" + r + ":" + g + ":" + b;
    }

    /**
     * Register the effects of an edge in this listener to test them later on.
     * @param takenEdge The taken edge of a model.
     * @param model Model of the edge.
     */
    registerEffectCheck(takenEdge: ProgramModelEdge, model: ProgramModel) {
        takenEdge.effects.forEach(effect => {
            this.effectChecks.push({effect: effect, edge: takenEdge, model: model});
        })
    }

    /**
     * Check the registered effects of this step.
     */
    checkEffects(): Effect[] {
        let result = this.check(this.effectChecks);
        this.failedChecks = result.failedEffects;
        this.effectChecks = [];
        return result.contradictingEffects;
    }

    private failOnProgramModel(edge, effect, modelResult, t) {
        let output = getEffectFailedOutput(edge, effect);
        console.error(output, t.getTotalStepsExecuted());
        modelResult.addFail(output);
    }

    private check(toCheck: { effect: Effect, edge: ProgramModelEdge, model: ProgramModel }[]) {
        let doNotCheck = {};
        let failedEffects = []

        // check for contradictions in effects
        for (let i = 0; i < toCheck.length; i++) {
            let effect = toCheck[i].effect;

            for (let j = i + 1; j < toCheck.length; j++) {
                if (effect.contradicts(toCheck[j].effect)) {
                    doNotCheck[i] = true;
                    doNotCheck[j] = true;
                }
            }

            if (!doNotCheck[i]) {
                let model = toCheck[i].model;
                let stepsSinceLastTransition = model.stepNbrOfLastTransition - model.stepNbrOfScndLastTransition + 1;
                try {
                    if (!effect.check(stepsSinceLastTransition, model.stepNbrOfProgramEnd)) {
                        failedEffects.push(toCheck[i]);
                    }
                } catch (e) {
                    failedEffects.push(toCheck[i]);
                }
            }
        }

        // Get the contradicting edges and return them for outputs
        let contradictingEffects = [];
        for (let i = 0; i < toCheck.length; i++) {
            if (doNotCheck[i]) {
                contradictingEffects.push(toCheck[i].effect);
            }
        }
        return {contradictingEffects, failedEffects};
    }

    /**
     * Check the failed effects of last step.
     */
    checkFailedEffects(modelResult: ModelResult) {
        if (!this.failedChecks || this.failedChecks.length == 0) {
            return;
        }
        this.checkFailed(this.failedChecks, this.failOnProgramModel, modelResult);
        this.failedChecks = [];
    }

    private checkFailed(toCheck: { effect: Effect, edge: ProgramModelEdge, model: ProgramModel }[],
                        makeFailedOutput: (edge, effect, modelResult, t) => void, modelResult: ModelResult) {

        for (let i = 0; i < toCheck.length; i++) {
            let effect = toCheck[i].effect;
            let model = toCheck[i].model;
            try {
                if (!effect.check(model.stepNbrOfLastTransition - model.stepNbrOfScndLastTransition,
                    model.stepNbrOfProgramEnd)) {
                    makeFailedOutput(toCheck[i].edge, effect, modelResult, this.testDriver);
                }
            } catch (e) {
                makeFailedOutput(toCheck[i].edge, effect, modelResult, this.testDriver);
            }
        }
    }
}
