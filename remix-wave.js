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

  var writeAudioBuffer = function(audioBuffer, a, offset, quanta) {
    var n = audioBuffer.length,
        bufferL = audioBuffer.getChannelData(0),
        sampleL,
        bufferR = audioBuffer.getChannelData(1),
        sampleR;

    for (var q = 0; q < quanta.length; q++) {
        var start = Math.floor(parseFloat(quanta[q].start) * audioBuffer.sampleRate);
        var end = Math.floor((parseFloat(quanta[q].start) + parseFloat(quanta[q].duration)) * audioBuffer.sampleRate);

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

  return function(audioBuffer, quanta) {
    var remixDuration = 0;
    for (var q = 0; q < quanta.length; q++) {
        remixDuration = remixDuration + parseFloat(quanta[q].duration);
    }
    var frameLength = remixDuration * audioBuffer.sampleRate,
        numberOfChannels = audioBuffer.numberOfChannels,
        sampleRate = audioBuffer.sampleRate,
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

    console.log("Sample rate: ", sampleRate);

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
    writeAudioBuffer(audioBuffer, waveFileData, 44, quanta);

    return waveFileData;
  }
}());


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

// Let's play with the filesystem, locally
function onInitFs(fs) {
    fs.root.getFile('test_wav_save.wav', {create: true}, function(fileEntry) {

    // Write some data
    fileEntry.createWriter(function(fileWriter) {
        fileWriter.onwriteend = function(e) {
        console.log('Write completed.');
        };
        fileWriter.onerror = function(e) {
        console.log('Write failed: ' + e.toString());
        };

        // Create a new Blob and write it.
        // I need to get each chunk as a buffer, somehow...
        // or figure out how AudioJEdit does their magic of ripping data out of things.
        // Something about context.startRendering...
        
        var blob = new Blob([Wav.createWaveFileData(track.buffer, remixed)], {type: 'binary'});

        fileWriter.write(blob);
    }, fileErrorHandler);

    // Set our link to point to the saved file.
    $('#downloadButton').attr("href", fileEntry.toURL());
    }, errorHandler);
}
