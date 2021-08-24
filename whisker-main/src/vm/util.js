class Util {
    // TODO: Split vm-wrapper it two: One wrapper that provides utility functions,
    // and another wrapper around it, that the controls the testing.

    /**
     * @param {VirtualMachine} vm .
     * @param {number} x .
     * @param {number} y .
     * @return {{x: number, y: number}} .
     */
    static getClientCoords (vm, x, y) {
        const rect = vm.runtime.renderer.gl.canvas.getBoundingClientRect();
        const [nWidth, nHeight] = vm.runtime.renderer.getNativeSize();
        return {
            x: (x * (rect.width / nWidth)) + (rect.width / 2),
            y: (-y * (rect.height / nHeight)) + (rect.height / 2)
        };
    }

    /**
     * @param {VirtualMachine} vm .
     * @param {number} x .
     * @param {number} y .
     * @return {{x: number, y: number}} .
     */
    static getScratchCoords (vm, x, y) {
        const rect = vm.runtime.renderer.gl.canvas.getBoundingClientRect();
        const [nWidth, nHeight] = vm.runtime.renderer.getNativeSize();
        return {
            x: (nWidth / rect.width) * (x - (rect.width / 2)),
            y: -(nHeight / rect.height) * (y - (rect.height / 2))
        };
    }

    /**
     * @param {VirtualMachine} vm .
     * @returns {{x: number, y: number}} .
     */
    static getMousePos (vm) {
        return {
            x: vm.runtime.ioDevices.mouse.getScratchX(),
            y: vm.runtime.ioDevices.mouse.getScratchY()
        };
    }

    /**
     * @param {VirtualMachine} vm .
     * @param {string} keyString .
     * @return {string} .
     */
    static getScratchKey (vm, keyString) {
        return vm.runtime.ioDevices.keyboard._keyStringToScratchKey(keyString);
    }

    /**
     * @param {VirtualMachine} vm .
     * @param {RenderedTarget} target .
     * @returns {boolean} .
     */
    static isTouchingMouse (vm, target) {
        const mousePos = this.getMousePos(vm);
        if (isNaN(mousePos.x) || isNaN(mousePos.y)) {
            return false;
        }
        return target.isTouchingObject('_mouse_');
    }

    /**
     * @param {VirtualMachine} vm .
     * @return {RenderedTarget} .
     */
    static getTargetSprite (vm) {
        let stage;
        for (const target of vm.runtime.targets) {
            if (target.isStage) {
                stage = target;
            } else if (this.isTouchingMouse(vm, target)) {
                return target;
            }
        }
        return stage;
    }
}

module.exports = Util;
