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

import {BitstringChromosomeGenerator} from "../../../../src/whisker/bitstring/BitstringChromosomeGenerator";
import {SearchAlgorithmProperties} from "../../../../src/whisker/search/SearchAlgorithmProperties";
import {FixedIterationsStoppingCondition} from "../../../../src/whisker/search/stoppingconditions/FixedIterationsStoppingCondition";
import {OneOfStoppingCondition} from "../../../../src/whisker/search/stoppingconditions/OneOfStoppingCondition";
import {MOSA} from "../../../../src/whisker/search/algorithms/MOSA";
import {FitnessFunction} from "../../../../src/whisker/search/FitnessFunction";
import {BitstringChromosome} from "../../../../src/whisker/bitstring/BitstringChromosome";
import {SingleBitFitnessFunction} from "../../../../src/whisker/bitstring/SingleBitFitnessFunction";
import {List} from "../../../../src/whisker/utils/List";
import {MIO} from "../../../../src/whisker/search/algorithms/MIO";

describe('MIO', () => {

    test('BitstringChromosome with SingleBitFitnessFunction', () => {
        const chromosomeLength = 10;
        const populationSize = 1;
        const iterations = 5000;
        const crossoverProbability = 0;
        const mutationProbability = 1;

        const properties = new SearchAlgorithmProperties(populationSize, crossoverProbability, mutationProbability);
        properties.setChromosomeLength(chromosomeLength);
        const chromosomeGenerator = new BitstringChromosomeGenerator(properties);
        const stoppingCondition = new OneOfStoppingCondition(new FixedIterationsStoppingCondition(iterations));
        const fitnessFunctions = new Map<number, FitnessFunction<BitstringChromosome>>();
        const heuristics = new Map<number, Function>();
        for (let i = 0; i < chromosomeLength; i++) {
            fitnessFunctions.set(i, new SingleBitFitnessFunction(chromosomeLength, i));
            heuristics.set(i, v => (v / chromosomeLength));
        }

        const searchAlgorithm = new MIO();
        searchAlgorithm.setProperties(properties);
        searchAlgorithm.setChromosomeGenerator(chromosomeGenerator);
        searchAlgorithm.setStoppingCondition(stoppingCondition);
        searchAlgorithm.setFitnessFunctions(fitnessFunctions);
        searchAlgorithm.setHeuristics(heuristics);
        searchAlgorithm.setMaximumArchiveSize(10);
        searchAlgorithm.setRandomSelectionProbability(0.5);

        const solutions = searchAlgorithm.findSolution() as List<BitstringChromosome>;
        expect(solutions === searchAlgorithm.getCurrentSolution()).toBeTruthy();

        for (const fitnessFunction of fitnessFunctions.values()) {
            let optimal = false;
            for (const solution of solutions) {
                if (fitnessFunction.isOptimal(fitnessFunction.getFitness(solution))) {
                    optimal = true;
                    break;
                }
            }
            expect(optimal).toBeTruthy();
        }
    });
});
