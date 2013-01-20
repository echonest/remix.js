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

    onAudioProcess: function () {
        if (!this.backend.isPaused()) {
            this.drawer.progress(this.backend.getPlayedPercents());
        }
    },

    playAt: function (percents) {
        this.backend.play(this.backend.getDuration() * percents);
    },

    pause: function () {
        this.backend.pause();
    },

    playPause: function () {
        if (this.backend.paused) {
            this.playAt(this.backend.getPlayedPercents() || 0);
        } else {
            this.pause();
        }
    },

    drawBuffer: function () {
        if (this.backend.currentBuffer) {
            this.drawer.drawBuffer(this.backend.currentBuffer);
        }
    },

    /**
     * Loads an audio file via XHR.
     */
    load: function (src) {
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
            my.backend.loadData(
                e.target.response,
                my.drawBuffer.bind(my)
            );
        }, false);

        xhr.open('GET', src, true);
        xhr.send();
    },
};
