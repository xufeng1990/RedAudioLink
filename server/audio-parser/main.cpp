// CLI wrapper for ProtoParseChannel.
// Usage: proto_parse_cli <path-to-wav>
// Reads a 16-bit PCM WAV file (mono or stereo) and feeds the PCM
// payload through ProtoParseChannel::PushBuffer in chunks, then
// prints the resulting JSON to stdout. Exit code is 0 on success
// (one valid packet decoded) and non-zero otherwise.

#include "proto_parse.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <vector>

struct WavInfo {
    int sampleRate;
    int channels;
    int bitsPerSample;
    std::vector<uint8_t> pcm;
};

static uint16_t rd16(const uint8_t* p) { return (uint16_t)p[0] | ((uint16_t)p[1] << 8); }
static uint32_t rd32(const uint8_t* p) {
    return (uint32_t)p[0] | ((uint32_t)p[1] << 8) | ((uint32_t)p[2] << 16) | ((uint32_t)p[3] << 24);
}

static int loadWav(const char* path, WavInfo& out) {
    FILE* f = fopen(path, "rb");
    if (!f) {
        fprintf(stderr, "ERR: cannot open %s\n", path);
        return -1;
    }
    fseek(f, 0, SEEK_END);
    long sz = ftell(f);
    fseek(f, 0, SEEK_SET);
    if (sz < 44) { fclose(f); fprintf(stderr, "ERR: file too small\n"); return -1; }
    std::vector<uint8_t> buf(sz);
    if (fread(buf.data(), 1, sz, f) != (size_t)sz) { fclose(f); fprintf(stderr, "ERR: read fail\n"); return -1; }
    fclose(f);

    if (memcmp(buf.data(), "RIFF", 4) != 0 || memcmp(buf.data() + 8, "WAVE", 4) != 0) {
        fprintf(stderr, "ERR: not a RIFF/WAVE\n");
        return -1;
    }

    size_t off = 12;
    int sampleRate = 0, channels = 0, bits = 0, format = 0;
    const uint8_t* dataPtr = NULL;
    size_t dataLen = 0;
    while (off + 8 <= (size_t)sz) {
        const uint8_t* h = buf.data() + off;
        uint32_t cs = rd32(h + 4);
        if (memcmp(h, "fmt ", 4) == 0) {
            const uint8_t* fmt = h + 8;
            format = rd16(fmt + 0);
            channels = rd16(fmt + 2);
            sampleRate = rd32(fmt + 4);
            bits = rd16(fmt + 14);
        } else if (memcmp(h, "data", 4) == 0) {
            dataPtr = h + 8;
            dataLen = cs;
            break;
        }
        off += 8 + cs;
        if (cs & 1) off++;
    }

    if (!dataPtr || !sampleRate || !channels || bits != 16 || (format != 1 && format != 0xFFFE)) {
        fprintf(stderr, "ERR: unsupported WAV format=%d ch=%d bits=%d sr=%d\n",
                format, channels, bits, sampleRate);
        return -1;
    }

    out.sampleRate = sampleRate;
    out.channels = channels;
    out.bitsPerSample = bits;
    out.pcm.assign(dataPtr, dataPtr + dataLen);
    return 0;
}

int main(int argc, char** argv) {
    if (argc < 2) {
        fprintf(stderr, "Usage: %s <wav>\n", argv[0]);
        return 2;
    }
    WavInfo wav;
    if (loadWav(argv[1], wav) != 0) return 3;

    // workMode=0 -> real-time mode; required for GetPacket to find DONE bands.
    // Use ProtoParse (high-level) so both stereo channels are tried.
    ProtoParse parser(wav.channels, wav.sampleRate, 0);

    int chunk = wav.sampleRate * (wav.bitsPerSample / 8) * wav.channels / 5; // ~200ms
    if (chunk < 4096) chunk = 4096;
    int state = ProtoParseChannel::PROTO_PARSE_STATE_READY;
    size_t pos = 0;
    bool done = false;
    while (pos < wav.pcm.size()) {
        size_t take = wav.pcm.size() - pos;
        if ((int)take > chunk) take = chunk;
        state = parser.PushBuffer(wav.pcm.data() + pos, (int)take);
        pos += take;
        if (state == ProtoParseChannel::PROTO_PARSE_STATE_DONE) { done = true; break; }
    }

    // Final verification pass over any remaining buffered data
    if (!done) {
        if (parser.VerifyPacket() == 1) done = true;
    }

    if (!done) {
        fprintf(stderr, "ERR: no valid packet decoded\n");
        return 4;
    }

    char outBuf[4096];
    memset(outBuf, 0, sizeof(outBuf));
    int rc = parser.GetPacket(outBuf, sizeof(outBuf));
    if (rc < 0 || outBuf[0] == 0) {
        fprintf(stderr, "ERR: GetPacket failed (%d)\n", rc);
        return 5;
    }
    fputs(outBuf, stdout);
    fputc('\n', stdout);
    return 0;
}
