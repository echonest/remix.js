// Remix.js
// Thor Kell & Paul Lamere, 12/2012
// Based on Paul Lamere's Infinite Jukebox and assorted other javascript projects

function createJRemixer(context, jquery, apiKey) {
    var $ = jquery;
    $.ajaxSetup({ cache: false });

    var remixer = {
        // If you have an EN TRack ID and the location of the audio.
        remixTrackById: function(trackID, trackURL, callback) {
            var track;
            var url = 'http://developer.echonest.com/api/v4/track/profile?format=json&bucket=audio_summary'

           var retryCount = 3;
           var retryInterval = 3000;

            function lookForAnalysis(trackID, trackURL, callback) {
                $.getJSON(url, {id:trackID, api_key:apiKey}, function(data) {
                    var analysisURL = data.response.track.audio_summary.analysis_url;
                    track = data.response.track;
                    
                    // This call is proxied through the yahoo query engine.  
                    // This is temporary, but works.
                    $.getJSON("http://query.yahooapis.com/v1/public/yql", 
                        { q: "select * from json where url=\"" + analysisURL + "\"", format: "json"}, 
                        function(data) {
                            if (data.query.results != null) {
                                track.analysis = data.query.results.json;
                                console.log("Analysis obtained...");
                                remixer.remixTrack(track, trackURL, callback);   
                            }
                            else {
                                retryCount = retryCount - 1;
                                retryInterval = retryInterval + retryInterval;
                                if (retryCount > 0) {
                                    console.log('Analysis pending, trying again')
                                    callback(track, "Analysis pending, retrying - 0");  
                                    setTimeout(function () {
                                        lookForAnalysis(trackID, trackURL, callback);
                                    }, retryInterval);
                                } else {
                                    callback(track, "Error:  no analysis data returned for that track - 0");  
                                    console.log('error', 'No analysis data returned:  try again, or try another trackID');   
                                }
                            }
                    }); // end yahoo proxy getJson
                });
            } // end lookForAnalysis
            lookForAnalysis(trackID, trackURL, callback);
        },

        // If you have a SoundCloud URL.
        remixTrackBySoundCloudURL: function(soundCloudURL, soundClouddClientID, callback) {
           var bridgeURL = "http://labs.echonest.com/SCAnalyzer/analyze?id=" + soundCloudURL;
           var retryCount = 3;
           var retryInterval = 2000;

           function lookForTrackID(bridgeURL, soundClouddClientID, callback) {
                $.getJSON(bridgeURL, function(data) {
                    if (data.status == "OK") {
                        var trackID = data.trid;
                        var scResolveURL = 'http://api.soundcloud.com/resolve.json'
                        $.getJSON(scResolveURL, {client_id:soundClouddClientID, url:soundCloudURL}, function(data) {
                            var downloadURL = data.stream_url + '?client_id=' + soundClouddClientID;
                            console.log('got all data from SoundCloud, about to start remix');  
                            remixer.remixTrackById(trackID, downloadURL, callback);
                        });
                    } else {
                        retryCount = retryCount - 1;
                        retryInterval = retryInterval + retryInterval;
                        if (retryCount > 0) {
                            setTimeout(function () {
                                lookForTrackID(bridgeURL, soundClouddClientID, callback);
                            }, retryInterval);
                        } else {
                            callback(track, "Error:  no trackID returned.");  
                            console.log('error', 'no trackID returned.');       
                        }
                     } // end else
                });
            }
            lookForTrackID(bridgeURL, soundClouddClientID, callback);
        },

        // If you have the analysis URL already, or if you've cached it in your app.
        // Be *very* careful when searching for analysis URL by song:  it may not match the track being used.  
        remixTrackByURL: function(analysisURL, trackURL, callback) {
            var track = new Object();
            $.getJSON(analysisURL, function(data) {
                track.analysis = data;
                track.status = "complete";
                remixer.remixTrack(track, trackURL, callback);

            });
        },

        remixTrack : function(track, trackURL, callback) {
            function fetchAudio(url) {
                var request = new XMLHttpRequest();
                trace("fetchAudio " + url);
                track.buffer = null;
                request.open("GET", url, true);
                request.responseType = "arraybuffer";
                this.request = request;

                request.onload = function() {

                    trace('audio loaded');
                     if (false) {
                        track.buffer = context.createBuffer(request.response, false);
                        track.status = 'ok'
                    } else {
                        context.decodeAudioData(request.response, 
                            function(buffer) {      // completed function
                                track.buffer = buffer;
                                track.status = 'ok';
                                callback(track, 100);   
                            }, 
                            function(e) { // error function
                                track.status = 'error: loading audio'
                                console.log('audio error', e);
                            }
                        );
                    }
                }
                request.onerror = function(e) {
                    trace('error loading loaded');
                    track.status = 'error: loading audio'
                }
                request.onprogress = function(e) {
                    var percent = Math.round(e.loaded * 100 / e.total);
                    callback(track, percent);   
                }
                request.send();
            }

            function preprocessTrack(track) {
                trace('preprocessTrack');
                var types = ['sections', 'bars', 'beats', 'tatums', 'segments'];

                for (var i in types) {
                    var type = types[i];
                    trace('preprocessTrack ' + type);
                    for (var j in track.analysis[type]) {
                        var qlist = track.analysis[type]
                        j = parseInt(j)
                        var q = qlist[j]

                        q.start = parseFloat(q.start);
                        q.duration = parseFloat(q.duration);
                        q.confidence = parseFloat(q.confidence);
                        if (type == 'segments') {
                            q.loudness_max = parseFloat(q.loudness_max);
                            q.loudness_max_time = parseFloat(q.loudness_max_time);
                            q.loudness_start = parseFloat(q.loudness_start);

                            for (var k = 0; k < q.pitches.length; k++) {
                                q.pitches[k] = parseFloat(q.pitches[k]);
                            }
                            for (var k = 0; k < q.timbre.length; k++) {
                                q.timbre[k] = parseFloat(q.timbre[k]);
                            }
                        }
                        q.track = track;
                        q.which = j;
                        if (j > 0) {
                            q.prev = qlist[j-1];
                        } else {
                            q.prev = null
                        }
                        
                        if (j < qlist.length - 1) {
                            q.next = qlist[j+1];
                        } else {
                            q.next = null
                        }
                    }
                }

                connectQuanta(track, 'sections', 'bars');
                connectQuanta(track, 'bars', 'beats');
                connectQuanta(track, 'beats', 'tatums');
                connectQuanta(track, 'tatums', 'segments');

                connectFirstOverlappingSegment(track, 'bars');
                connectFirstOverlappingSegment(track, 'beats');
                connectFirstOverlappingSegment(track, 'tatums');

                connectAllOverlappingSegments(track, 'bars');
                connectAllOverlappingSegments(track, 'beats');
                connectAllOverlappingSegments(track, 'tatums');

                filterSegments(track);
            }

            function filterSegments(track) {
                var threshold = .3;
                var fsegs = [];
                fsegs.push(track.analysis.segments[0]);
                for (var i = 1; i < track.analysis.segments.length; i++) {
                    var seg = track.analysis.segments[i];
                    var last = fsegs[fsegs.length - 1];
                    if (isSimilar(seg, last) && seg.confidence < threshold) {
                        fsegs[fsegs.length -1].duration += seg.duration;
                    } else {
                        fsegs.push(seg);
                    }
                }
                track.analysis.fsegments = fsegs;
            }

            function isSimilar(seg1, seg2) {
                var threshold = 1;
                var distance = timbral_distance(seg1, seg2);
                return (distance < threshold);
            }

            function connectQuanta(track, parent, child) {
                var last = 0;
                var qparents = track.analysis[parent];
                var qchildren = track.analysis[child];

                for (var i in qparents) {
                    var qparent = qparents[i]
                    qparent.children = [];

                    for (var j = last; j < qchildren.length; j++) {
                        var qchild = qchildren[j];
                        if (qchild.start >= qparent.start 
                                    && qchild.start < qparent.start + qparent.duration) {
                            qchild.parent = qparent;
                            qchild.indexInParent = qparent.children.length;
                            qparent.children.push(qchild);
                            last = j;
                        } else if (qchild.start > qparent.start) {
                            break;
                        }
                    }
                }
            }

            // connects a quanta with the first overlapping segment
            function connectFirstOverlappingSegment(track, quanta_name) {
                var last = 0;
                var quanta = track.analysis[quanta_name];
                var segs = track.analysis.segments;

                for (var i = 0; i < quanta.length; i++) {
                    var q = quanta[i]

                    for (var j = last; j < segs.length; j++) {
                        var qseg = segs[j];
                        if (qseg.start >= q.start) {
                            q.oseg = qseg;
                            last = j;
                            break
                        } 
                    }
                }
            }

            function connectAllOverlappingSegments(track, quanta_name) {
                var last = 0;
                var quanta = track.analysis[quanta_name];
                var segs = track.analysis.segments;

                for (var i = 0; i < quanta.length; i++) {
                    var q = quanta[i]
                    q.overlappingSegments = [];

                    for (var j = last; j < segs.length; j++) {
                        var qseg = segs[j];
                        // seg starts before quantum so no
                        if (parseFloat(qseg.start) + parseFloat(qseg.duration) < parseFloat(q.start)) {
                            continue;
                        }
                        // seg starts after quantum so no
                        if (parseFloat(qseg.start) > parseFloat(q.start) + parseFloat(q.duration)) {
                            break;
                        }
                        last = j;
                        q.overlappingSegments.push(qseg);
                    }
                }
            }


            if (track.status == 'complete') {
                preprocessTrack(track);
                fetchAudio(trackURL);
            } else {
                track.status = 'error: incomplete analysis';
            }
        },

        getPlayer : function(effects) {
            var queueTime = 0;
            var audioGain = context.createGain();
            var curAudioSource = null;
            var currentlyQueued = new Array();
            var curQ = null;
            var onPlayCallback = null;
            var afterPlayCallback = null;
            var currentTriggers = new Array();
            audioGain.gain.value = 1;

            // Connect effects
            effects = effects || [];
            effects.unshift(audioGain);
            for (var i = 0; i < effects.length -1; i++) {
                effects[i].connect(effects[i + 1]);
            }
            effects[i].connect(context.destination);

            function queuePlay(when, q) {
                audioGain.gain.value = 1;
                if (isAudioBuffer(q)) {
                    var audioSource = context.createBufferSource();
                    audioSource.buffer = q;
                    audioSource.connect(audioGain);
                    currentlyQueued.push(audioSource);
                    audioSource.start(when);
                    if (onPlayCallback != null) {
                        theTime = (when - context.currentTime) *  1000;
                        currentTriggers.push(setTimeout(onPlayCallback, theTime));
                    }
                    if (afterPlayCallback != null) {
                        theTime = (when - context.currentTime + parseFloat(q.duration)) *  1000;
                        currentTriggers.push(setTimeout(afterPlayCallback, theTime));
                    }
                    return when + parseFloat(q.duration);
                } else if ($.isArray(q)) {
                    // Correct for load times
                    if (when == 0) {
                        when = context.currentTime;
                    }
                    for (var i = 0; i < q.length; i++) {
                        when = queuePlay(when, q[i]);
                    }
                    return when;
                } else if (isQuantum(q)) {
                    var audioSource = context.createBufferSource();
                    audioSource.buffer = q.track.buffer;
                    audioSource.connect(audioGain);
                    q.audioSource = audioSource;
                    currentlyQueued.push(audioSource);
                    audioSource.start(when, q.start, q.duration);

                    // I need to clean up all these ifs
                    if ("syncBuffer" in q) {
                        var audioSource = context.createBufferSource();
                        audioSource.buffer = q.syncBuffer;
                        audioSource.connect(audioGain);
                        currentlyQueued.push(audioSource);
                        audioSource.start(when);
                    }

                    if (onPlayCallback != null) {
                        theTime = (when - context.currentTime) *  1000;
                        currentTriggers.push(setTimeout(onPlayCallback, theTime));
                    }
                    if (afterPlayCallback != null) {
                        theTime = (when - context.currentTime + parseFloat(q.duration)) *  1000;
                        currentTriggers.push(setTimeout(afterPlayCallback, theTime));
                    }
                    return (when + parseFloat(q.duration));
                } 
                else if (isSilence(q)) {
                    return (when + parseFloat(q.duration));
                }
                else {
                    error("can't play " + q);
                    return when;
                }
            }

            function error(s) {
                console.log(s);
            }

            var player = {
                play: function(when, q) {
                    return queuePlay(0, q);
                },

                addOnPlayCallback: function(callback) {
                    onPlayCallback = callback;
                },
        
                addAfterPlayCallback: function(callback) {
                    afterPlayCallback = callback;
                },

                queue: function(q) {
                    var now = context.currentTime;
                    if (now > queueTime) {
                        queueTime = now;
                    }
                    queueTime = queuePlay(queueTime, q);
                },

                queueRest: function(duration) {
                    queueTime += duration;
                },

                stop: function() {
                    for (var i = 0; i < currentlyQueued.length; i++) {
                        if (currentlyQueued[i] != null) {
                            currentlyQueued[i].stop();
                        }
                    }
                    currentlyQueued = new Array();

                    if (currentTriggers.length > 0) {
                        for (var i = 0; i < currentTriggers.length; i++) {
                            clearTimeout(currentTriggers[i])
                        }
                        currentTriggers = new Array();
                    }
                },

                curTime: function() {
                    return context.currentTime;
                },
            }
            return player;
        },

        fetchSound : function(audioURL, callback) {
            var request = new XMLHttpRequest();

            trace("fetchSound " + audioURL);
            request.open("GET", audioURL, true);
            request.responseType = "arraybuffer";
            this.request = request;

            request.onload = function() {
                var buffer = context.createBuffer(request.response, false);
                callback(true, buffer);
            }

            request.onerror = function(e) {
                callback(false, null);
            }
            request.send();
        },

        // Saves the remixed audio using the HTML 5 temporary filesystem
        saveRemixLocally : function(fs, remixed, callback) {
            fs.root.getFile('my-remix.wav', {create: true}, function(fileEntry) {
                fileEntry.createWriter(function(fileWriter) {
                    fileWriter.onwriteend = function(e) {
                    console.log('Write completed.');
                    callback(fileEntry.toURL());
                    };
                    fileWriter.onerror = function(e) {
                    console.log('Write failed: ' + e.toString());
                    };

                    var blob = new Blob([Wav.createWaveFileData(remixed)], {type: 'binary'});

                    fileWriter.write(blob);
                }, fileErrorHandler);
            }, fileErrorHandler);
        },
 
    };

    function isQuantum(a) {
        return 'start' in a && 'duration' in a;
    }

    function isAudioBuffer(a) {
        return 'getChannelData' in a;
    }

    function isSilence(a) {
        return 'isSilence' in a;
    }

    function trace(text) {
        if (false) {
            console.log(text);
        }
    }

    return remixer;
}


function euclidean_distance(v1, v2) {
    var sum = 0;
    for (var i = 0; i < 3; i++) {
        var delta = v2[i] - v1[i];
        sum += delta * delta;
    }
    return Math.sqrt(sum);
}

function timbral_distance(s1, s2) {
    return euclidean_distance(s1.timbre, s2.timbre);
}

function clusterSegments(track, numClusters, fieldName, vecName) {
    var vname = vecName || 'timbre';
    var fname = fieldName || 'cluster';
    var maxLoops = 1000;

    function zeroArray(size) {
        var arry = [];
        for (var i = 0; i < size; i++) {
            arry.push(0);
        }
        return arry;
    }

    function reportClusteringStats() {
        var counts = zeroArray(numClusters);
        for (var i = 0; i < track.analysis.segments.length; i++) {
            var cluster = track.analysis.segments[i][fname];
            counts[cluster]++;
        }
        //console.log('clustering stats');
        for (var i = 0; i < counts.length; i++) {
            //console.log('clus', i, counts[i]);
        }
    }

    function sumArray(v1, v2) {
        for (var i = 0; i < v1.length; i++) {
            v1[i] += v2[i];
        }
        return v1;
    }

    function divArray(v1, scalar) {
        for (var i = 0; i < v1.length; i++) {
            v1[i] /= scalar
        }
        return v1;
    }
    function getCentroid(cluster) {
        var count = 0;
        var segs = track.analysis.segments;
        var vsum = zeroArray(segs[0][vname].length);

        for (var i = 0; i < segs.length; i++) {
            if (segs[i][fname] === cluster) {
                count++;
                vsum = sumArray(vsum, segs[i][vname]);
            }
        }

        vsum = divArray(vsum, count);
        return vsum;
    }

    function findNearestCluster(clusters, seg) {
        var shortestDistance = Number.MAX_VALUE;
        var bestCluster = -1;

        for (var i = 0; i < clusters.length; i++) {
            var distance = euclidean_distance(clusters[i], seg[vname]);
            if (distance < shortestDistance) {
                shortestDistance = distance;
                bestCluster = i;
            }
        }
        return bestCluster;
    }

    // kmeans clusterer
    // use random initial assignments
    for (var i = 0; i < track.analysis.segments.length; i++) {
        track.analysis.segments[i][fname] = Math.floor(Math.random() * numClusters);
    }

    reportClusteringStats();

    while (maxLoops-- > 0) {
        // calculate cluster centroids
        var centroids = [];
        for (var i = 0; i < numClusters; i++) {
            centroids[i] = getCentroid(i);
        }
        // reassign segs to clusters
        var switches = 0;
        for (var i = 0; i < track.analysis.segments.length; i++) {
            var seg = track.analysis.segments[i];
            var oldCluster = seg[fname];
            var newCluster = findNearestCluster(centroids, seg);
            if (oldCluster !== newCluster) {
                switches++;
                seg[fname] = newCluster;
            }
        }
        //console.log("loopleft", maxLoops, 'switches', switches);
        if (switches == 0) {
            break;
        }
    }
    reportClusteringStats();
}

// Helper functions for handling uploads with Echo Nest support
function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

function fixFileName(name) {
    name = name.replace(/c:\\fakepath\\/i, '');
    name = name.replace(/[^A-Z0-9.\-]+/gi, ' ');
    name = Math.floor(Math.random(10000) * 10000) + ".mp3";
    return 'remix_audio/' + apiKey + '/' + new Date().getTime() + '/' + name;
}

function fetchSignature() {
    var url = 'http://remix.echonest.com/Uploader/verify?callback=?&v=audio';
    $.getJSON(url, {}, function(data) {
        policy = data.policy;
        signature = data.signature;
        $('#f-policy').val(data.policy);
        $('#f-signature').val(data.signature);
        $('#f-key').val(data.key);
    });
}

function getProfile(trackID, callback) {
    var url = 'http://remix.echonest.com/Uploader/profile?callback=?';
    return $.getJSON(url, {trid: trackID}, callback); 
}

function urldecode(str) {
   return decodeURIComponent((str+'').replace(/\+/g, '%20'));
}


// Error handler for writing remixes to wav files
function fileErrorHandler(e) {
  var msg = '';

  switch (e.code) {
    case FileError.QUOTA_EXCEEDED_ERR:
      msg = 'QUOTA_EXCEEDED_ERR';
      break;
    case FileError.NOT_FOUND_ERR:
      msg = 'NOT_FOUND_ERR';
      break;
    case FileError.SECURITY_ERR:
      msg = 'SECURITY_ERR';
      break;
    case FileError.INVALID_MODIFICATION_ERR:
      msg = 'INVALID_MODIFICATION_ERR';
      break;
    case FileError.INVALID_STATE_ERR:
      msg = 'INVALID_STATE_ERR';
      break;
    default:
      msg = 'Unknown Error';
      break;
  };

  console.log('Error: ' + msg);
}

// Wav code based on Tomás Senart's AudioJEdit - https://github.com/tsenart/audiojedit
var Wav = {};
Wav.createWaveFileData = (function() {
  var writeString = function(s, a, offset) {
    for (var i = 0; i < s.length; ++i) {
      a[offset + i] = s.charCodeAt(i);
    }
  };

  var writeInt16 = function(n, a, offset) {
    n = n | 0;
    a[offset + 0] = n & 255;
    a[offset + 1] = (n >> 8) & 255;
  };

  var writeInt32 = function(n, a, offset) {
    n = n | 0
    a[offset + 0] = n & 255;
    a[offset + 1] = (n >> 8) & 255;
    a[offset + 2] = (n >> 16) & 255;
    a[offset + 3] = (n >> 24) & 255;
  };

  var writeAudioBuffer = function(a, offset, quanta) {
    var bufferL, sampleL, bufferR, sampleR;
    var currentBuffer;

    for (var q = 0; q < quanta.length; q++) {

        currentBuffer = quanta[q].track.buffer;
        bufferL = currentBuffer.getChannelData(0);
        bufferR = currentBuffer.getChannelData(1);

        var start = Math.floor(parseFloat(quanta[q].start) * currentBuffer.sampleRate);
        var end = Math.floor((parseFloat(quanta[q].start) + parseFloat(quanta[q].duration)) * currentBuffer.sampleRate);

        for (var i = start; i < end; ++i) {
            sampleL = bufferL[i] * 32768.0;
            sampleR = bufferR[i] * 32768.0;

            // Clip left and right samples to the limitations of 16-bit.
            // If we don't do this then we'll get nasty wrap-around distortion.
            if (sampleL < -32768) { sampleL = -32768; }
            if (sampleL >  32767) { sampleL =  32767; }
            if (sampleR < -32768) { sampleR = -32768; }
            if (sampleR >  32767) { sampleR =  32767; }

            writeInt16(sampleL, a, offset);
            writeInt16(sampleR, a, offset + 2);
            offset += 4; 
        }
    }
  };

  return function(quanta) {
    var remixDuration = 0;
    for (var q = 0; q < quanta.length; q++) {
        remixDuration = remixDuration + parseFloat(quanta[q].duration);
    }
    var currentBuffer = quanta[0].track.buffer;
    var frameLength = remixDuration * currentBuffer.sampleRate,
        numberOfChannels = currentBuffer.numberOfChannels,
        sampleRate = currentBuffer.sampleRate,
        bitsPerSample = 16,
        byteRate = sampleRate * numberOfChannels * bitsPerSample / 8,
        blockAlign = numberOfChannels * bitsPerSample / 8,
        wavDataByteLength = frameLength * numberOfChannels * 2, // 16-bit audio
        headerByteLength = 44,
        totalLength = headerByteLength + wavDataByteLength,
        waveFileData = new Uint8Array(totalLength),
        subChunk1Size = 16, // for linear PCM
        subChunk2Size = wavDataByteLength,
        chunkSize = 4 + (8 + subChunk1Size) + (8 + subChunk2Size);

    writeString('RIFF', waveFileData, 0);
    writeInt32(chunkSize, waveFileData, 4);
    writeString('WAVE', waveFileData, 8);
    writeString('fmt ', waveFileData, 12);

    writeInt32(subChunk1Size, waveFileData, 16);      // SubChunk1Size (4)
    writeInt16(1, waveFileData, 20);                  // AudioFormat (2)
    writeInt16(numberOfChannels, waveFileData, 22);   // NumChannels (2)
    writeInt32(sampleRate, waveFileData, 24);         // SampleRate (4)
    writeInt32(byteRate, waveFileData, 28);           // ByteRate (4)
    writeInt16(blockAlign, waveFileData, 32);         // BlockAlign (2)
    writeInt32(bitsPerSample, waveFileData, 34);      // BitsPerSample (4)

    writeString('data', waveFileData, 36);
    writeInt32(subChunk2Size, waveFileData, 40);      // SubChunk2Size (4)

    // Write actual audio data starting at offset 44.
    writeAudioBuffer(waveFileData, 44, quanta);

    return waveFileData;
  }
}());
