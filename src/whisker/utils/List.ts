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

/**
 * A class to store a list of elements of the same type.
 *
 * @param <T> The type of the list elements
 * @author Sophia Geserer
 */
export class List<T> {

    /**
     * The list of the elements.
     */
    private _items: T[];

    /**
     * Creates an empty list.
     */
    constructor(items = []) {
        this._items = items;
    }

    /**
     * Returns the number of elements in this list.
     * @returns the number of elements in this list
     */
    size(): number {
        return this._items.length;
    }

    /**
     * Returns {@code true} if this list contains no elements.
     * @returns {@code true} if this list contains no elements
     */
    isEmpty(): boolean {
        return this.size() === 0;
    }

    /**
     * Appends the specified element to the end of this list.
     * @param element element to be added to the list
     */
    add(element: T): void {
        this._items.push(element);
    }

    /**
     * Appends the specified element to the end of this list.
     * @param element element to be added to the list
     */
    addAll(elements: T[]): void {
        this._items = this._items.concat(elements) // TODO: Nicer way to do this?
    }

    /**
     * Appends the specified element to the end of this list.
     * @param element element to be added to the list
     */
    addList(other: List<T>): void {
        this._items = this._items.concat(other._items) // TODO: Nicer way to do this?
    }

    /**
     * Returns the element at the specified position in this list.
     * @param index index of the element to return
     * @returns the element at the specified position in the list
     */
    get(index: number): T {
        return this._items[index];
    }

    /**
     * Remove all elements in the list
     */
    clear() {
        this._items = [];
    }

    /**
     * Create a (shallow) copy
     */
    clone() {
        const copiedItems = [...this._items];
        return new List<T>(copiedItems);
    }
}
