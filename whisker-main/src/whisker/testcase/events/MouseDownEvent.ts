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

import VirtualMachine from 'scratch-vm/src/virtual-machine.js';
import {ScratchEvent} from "../ScratchEvent";
import {Container} from "../../utils/Container";
import {List} from "../../utils/List";

export class MouseDownEvent implements ScratchEvent {

    private readonly _value: boolean;

    constructor(value: boolean) {
        this._value = value;
    }

    async apply(vm: VirtualMachine): Promise<void> {
        Container.testDriver.inputImmediate({
            device: 'mouse',
            isDown: this._value
        });
    }

    public toJavaScript(args: number[]): string {
        return '' +
`t.inputImmediate({
    device: 'mouse',
    isDown: ${this._value}
});`;
    }

    public toString = (args: number[]) : string => {
        return "MouseDown " + this._value;
    }

    getNumParameters(): number {
        return 0;
    }

    getParameter(): number[] {
        // 0 returns False in JS/TS
        return [this._value ? 1 : 0];
    }

    setParameter(codons: List<number>, codonPosition: number): void {
        return;
    }
}
