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

import {ChromosomeGenerator} from '../search/ChromosomeGenerator';
import {SearchAlgorithmProperties} from '../search/SearchAlgorithmProperties';
import {List} from '../utils/List';
import {IntegerListChromosome} from "./IntegerListChromosome";
import {Randomness} from "../utils/Randomness";

export class IntegerListChromosomeGenerator implements ChromosomeGenerator<IntegerListChromosome> {

    private readonly _length : number;

    private readonly _min : number;

    private readonly _max : number;

    // TODO: Set min and max

    constructor(properties: SearchAlgorithmProperties<IntegerListChromosome>) {
        this._length = properties.getChromosomeLength();
    }

    /**
     * Creates and returns a random chromosome.
     * @returns a random chromosome
     */
    get(): IntegerListChromosome {
        let codons = new List<number>();
        for(let i = 0; i < this._length; i++) {
            codons.add(Randomness.getInstance().nextInt(this._min, this._max));
        }
        return new IntegerListChromosome(codons);
    }
}
