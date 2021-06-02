import VirtualMachine from "scratch-vm/src/virtual-machine";
import {RenderedTarget} from "scratch-vm/src/sprites/rendered-target";
import Cast from "scratch-vm/src/util/cast";

const twgl = require('twgl.js');


export class InputExtraction {

    /**
     * Extracts pieces of information from all Sprites of the given Scratch project.
     * @param vm the Scratch VM.
     * @return Returns a map where each sprite maps to the extracted information map of the specific sprite.
     */
    // TODO: It might be necessary to not only distinguish original sprites but also cloned sprites.
    //  Currently if and only if two cloned sprites of the same parent Sprite occur in differing temporal orders,
    //  the inputNodes are not correctly assigned to the corresponding clones.
    static extractSpriteInfo(vm: VirtualMachine): Map<string, Map<string, number>> {
        // Clear the collected sprite information.
        const spriteMap = new Map<string, Map<string, number>>();

        // Go through each sprite and collect input features from them.
        for (const target of vm.runtime.targets) {
            let cloneCounter = 0;
            if (!target.isStage && target.hasOwnProperty('blocks')) {
                const spriteFeatures = this._extractInfoFromSprite(target, vm);
                if (target.isOriginal) {
                    spriteMap.set(target.sprite.name, spriteFeatures);
                } else {
                    spriteMap.set(target.sprite.name + "-" + cloneCounter++, spriteFeatures);
                }
            }
        }
        return spriteMap;
    }

    /**
     * Extracts the pieces of information of the given sprite and normalises in the range [-1, 1]
     * @param sprite the RenderTarget (-> Sprite) from which information is gathered
     * @param vm the Scratch-VM of the given project
     * @return 1-dim array with the columns representing the gathered pieces of information
     */
    private static _extractInfoFromSprite(sprite: RenderedTarget, vm: VirtualMachine): Map<string, number> {
        const spriteFeatures = new Map<string, number>();
        // stageWidth and stageHeight used for normalisation
        const stageWidth = sprite.renderer._nativeSize[0];
        const stageHeight = sprite.renderer._nativeSize[1];

        // Collect Coordinates and normalize
        let x = sprite.x / (stageWidth / 2.);
        let y = sprite.y / (stageHeight / 2.);

        // Clamp within the stage
        x = Math.max(-1, Math.min(x, 1))
        y = Math.max(-1, Math.min(y, 1))

        spriteFeatures.set("X-Position", x);
        spriteFeatures.set("Y-Position", y);

        // Collect additional information based on the behaviour of the sprite
        for (const blockId of Object.keys(sprite.blocks._blocks)) {
            const block = sprite.blocks.getBlock(blockId);
            switch (sprite.blocks.getOpcode(block)) {

                // Check if the sprite interacts with another sprite.
                case "sensing_touchingobjectmenu":
                    for (const target of vm.runtime.targets) {
                        if (target.sprite.name === block.fields.TOUCHINGOBJECTMENU.value) {
                            const distances = this.calculateDistancesSigned(sprite.x, target.x, sprite.y, target.y,
                                stageWidth, stageHeight);
                            spriteFeatures.set("DistanceTo" + target.sprite.name + "-X", distances.dx);
                            spriteFeatures.set("DistanceTo" + target.sprite.name + "-Y", distances.dy);
                        }
                    }
                    break;

                // Check if the sprite interacts with a color on the screen or on a sprite.
                case "sensing_touchingcolor": {
                    const sensedColor = sprite.blocks.getBlock(block.inputs.COLOR.block).fields.COLOUR.value;
                    const distances = this.calculateColorDistance(sprite, sensedColor);
                    // We only want to add distances if we found the color within the scan radius.
                    if (distances.dx && distances.dy) {
                        spriteFeatures.set("DistanceTo" + sensedColor + "-X", distances.dx);
                        spriteFeatures.set("DistanceTo" + sensedColor + "-Y", distances.dy);
                    }
                    break;
                }

                // Check if the sprite is capable of switching his costume.
                case "looks_switchcostumeto":
                    spriteFeatures.set("Costume", sprite.currentCostume / sprite.sprite.costumes_.length);
                    break;
            }
        }
        return spriteFeatures;
    }

    /**
     * Calculates the distance in x and y direction of two positions on the stage and normalizes it in the range of
     * [-1, 1]. The sign is determined by the relative position of the coordinates;
     * the negative sign means x1 is left of x2 and y1 is below y2
     * the positive sign means x1 is right of x2 and y1 is atop y2
     * @param x1 the first x-coordinate
     * @param x2 the second x-coordinate
     * @param y1 the first y-coordinate
     * @param y2 the second y-coordinate
     * @param stageWidth the width of the stage; used for normalization
     * @param stageHeight the height of the stage; used for normalization
     */
    private static calculateDistancesSigned(x1: number, x2: number, y1: number, y2: number,
                                            stageWidth: number, stageHeight: number): { dx: number, dy: number } {
        // Calculate the normalised distance of the x-Dimension
        let dx = Math.abs(x1 - x2);
        if (x1 < x2)
            dx *= -1;
        if (Math.sign(x1) === Math.sign(x2))
            dx /= (stageWidth / 2.);
        else {
            dx /= stageWidth;
        }

        // We might overshoot the stage
        if (dx < -1)
            dx = -1;
        else if (dx > 1)
            dx = 1;

        // Calculate the normalised distance of the y-Dimension
        let dy = Math.abs(y1 - y2);
        if (y1 < y2)
            dy *= -1;
        if (Math.sign(y1) === Math.sign(y2))
            dy /= (stageHeight / 2.);
        else {
            dy /= stageHeight;
        }

        // We might overshoot the Stage due to the size of the x and y sources.
        if (dy < -1)
            dy = -1;
        else if (dy > 1)
            dy = 1;

        return {dx, dy};
    }

    /**
     * Calculates the distance between a sprite and a sensed color using an ever increasing scan radius.
     * @param sprite the source sprite
     * @param sensedColor the color we are searching for in hex representation
     */
    private static calculateColorDistance(sprite: RenderedTarget, sensedColor: string): { dx: number, dy: number } {
        // Gather the sensed color of the block and transform it in the [r,g,b] format
        const color3b = Cast.toRgbColorList(sensedColor);

        // Collect all touchable objects which might carry the sensed color
        const renderer = sprite.runtime.renderer;
        const touchableObjects = [];
        for (let index = renderer._visibleDrawList.length - 1; index >= 0; index--) {
            const id = renderer._visibleDrawList[index];
            if (id !== sprite.drawableID) {
                const drawable = renderer._allDrawables[id];
                touchableObjects.push({
                    id,
                    drawable
                });
            }
        }

        // Scan an ever increasing radius around the source sprite and check if we found an object carrying the
        // sensed color. We stop if the radius is greater than maxRadius.
        const point = twgl.v3.create();
        const color = new Uint8ClampedArray(4);
        let r = 1;
        const maxRadius = 100
        while (r < maxRadius) {
            const coordinates = [];
            for (const x of [-r, r]) {
                for (let y = -r; y <= r; y++) {
                    coordinates.push([x, y]);
                }
            }
            for (const y of [-r, r]) {
                for (let x = -r; x <= r; x++) {
                    coordinates.push([x, y]);
                }
            }
            for (const c of coordinates) {
                const x = c[0];
                const y = c[1];
                point[0] = sprite.x + x;
                point[1] = sprite.y + y;
                renderer.constructor.sampleColor3b(point, touchableObjects, color);

                // Check if we found an object carrying the correct color.
                if (this.isColorMatching(color, color3b)) {
                    return this.calculateDistancesSigned(point[0], x, point[1], y,
                        sprite.renderer._nativeSize[0], sprite.renderer._nativeSize[1]);
                }
            }
            // Increase the scan radius.
            r++;
        }
        return {dx: undefined, dy: undefined};
    }

    /**
     * Check if color1 matches color2.
     * @param color1 the first color
     * @param color2 the second color
     */
    private static isColorMatching(color1: Uint8ClampedArray, color2: Uint8ClampedArray): boolean {
        return (color1[0] & 0b11111000) === (color2[0] & 0b11111000) &&
            (color1[1] & 0b11111000) === (color2[1] & 0b11111000) &&
            (color1[2] & 0b11110000) === (color2[2] & 0b11110000);
    }
}

