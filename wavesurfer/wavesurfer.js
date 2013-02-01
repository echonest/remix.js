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

    drawBuffer: function () {
        if (this.backend.currentBuffer) {
            this.drawer.drawBuffer(this.backend.currentBuffer);
        }
    },

    /**
     * Loads an audio file via XHR.
     */
    // Can I tweak this to take a buffer (track.buffer?)?
    loadbBuffer: function(buffer, quanta) {
        var my = this;
        my.drawer.remixedData = quanta;
        my.backend.loadData(
                buffer,
                my.drawBuffer.bind(my)
            );
    },


    load: function (src, quanta) {
        var my = this;
        var xhr = new XMLHttpRequest();
        xhr.responseType = 'arraybuffer';

        xhr.addEventListener('progress', function (e) {
            if (e.lengthComputable) {
                var percentComplete = e.loaded / e.total;
            } else {
                // TODO
                percentComplete = 0;
            }
            my.drawer.drawLoading(percentComplete);
        }, false);

        xhr.addEventListener('load', function (e) {
            my.drawer.remixedData = quanta;
            my.backend.loadData(
                e.target.response,
                my.drawBuffer.bind(my)
            );
        }, false);

        xhr.open('GET', src, true);
        xhr.send();
    },
};
