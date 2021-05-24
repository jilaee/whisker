/*
 * Copyright (C) 2020 Whisker contributors
 *
 * This file is part of the Whisker test generator for Scratch.
 *
 * Whisker is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Whisker is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Whisker. If not, see http://www.gnu.org/licenses/.
 *
 */

import {RenderedTarget} from 'scratch-vm/src/sprites/rendered-target';
import {Container} from "../../utils/Container";
import {ParameterTypes} from "./ParameterTypes";


export abstract class ScratchEvent {

    /**
     * Applies the event to the VM stored in the Container using the parameters stored in the attributes.
     */
    abstract apply(): Promise<void>;

    /**
     * Returns the number of variable parameters required by this event.
     */
    abstract getNumVariableParameters(): number;

    /**
     * Sets the parameter(s) of this event using the given arguments.
     * @param args the values to which the parameters of this event should be set to
     * @param argType the type of the given arguments decides how they should be interpreted as parameters
     */
    abstract setParameter(args: number[], argType: ParameterTypes): void;

    /**
     * Returns the parameter(s) of this event.
     */
    abstract getParameter(): (number | string | RenderedTarget) [];

    /**
     * Returns the name(s) of the changeable parameter(s).
     */
    abstract getVariableParameterNames(): string[];

    /**
     * Transforms the event into an executable Whisker-Test statement.
     */
    abstract toJavaScript(): string;

    /**
     * Transforms the event into a string representation.
     */
    abstract toString(): string;

    /**
     * Returns an identifier as string which treats events with variable parameters as equal and events whose
     * parameters are determined by the ScratchEventExtractor as different.
     */
    abstract stringIdentifier():string;

    /**
     * Fits the given coordinates to the Scratch-Stage.
     * @param x the x-coordinate to fit into the range [-StageWidth/2, StageWidth/2]
     * @param y the y-coordinate to fit into the range [-StageHeight/2, StageHeight]
     */
    protected fitCoordinates(x: number, y: number): { x: number, y: number } {
        const width = Container.vmWrapper.getStageSize().width;
        const height = Container.vmWrapper.getStageSize().height;
        x = (x % width) - (width / 2);
        y = (y % height) - (height / 2);
        return {x, y};
    }
}


