'use strict';

var WaveSurfer = {
    init: function (params) {
        var my = this;

        if (params.audio) {
            var backend = WaveSurfer.Audio;
        } else {
            backend = WaveSurfer.WebAudio;
        }

        this.backend = Object.create(backend);
        this.backend.init(params);

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
