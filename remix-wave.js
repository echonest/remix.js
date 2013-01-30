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

    console.log("Number of samples, I think: ", n);

    for (var q = 0; q < quanta.length; q++) {
        console.log(quanta[q].start * 44100);
        console.log((quanta[q].start + quanta[q].duration) * 44100);
    }

    for (var i = 0; i < n; ++i) {

      // if n is not within a quanta, skip it.  
      // Better is for each quanta, get the samples...
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
  };

  return function(audioBuffer, quanta) {

    // I'll have to shorten the length, but let's just get the data out for now.
    var frameLength = audioBuffer.length,
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
