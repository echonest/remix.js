'use strict';

var WaveSurfer = {
    init: function (params) {
        var my = this;
        this.drawer = Object.create(WaveSurfer.Drawer);
        this.drawer.init(params);
    },


    /**
     * Loads an audio file via XHR.
     */
    // Can I tweak this to take a buffer (track.buffer?)?
    loadBuffer: function(buffer, quanta) {
        var my = this;
        my.drawer.remixedData = quanta;
        my.drawer.drawBuffer(buffer)
    },

};
