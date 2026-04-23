#include "proto_parse.h"
#include <fftw3.h>
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#define getInt16(data, off) (data[off] + ((uint16_t)data[off + 1]) * 256)
#define getUID(data, off)   (data[off] + ((uint16_t)data[off + 1]) * 256 + ((uint32_t)data[off + 2]) * 65536)
#define _square

#define version ("core V1.2.0.a")

static unsigned char XorKeys[32] = {0xb5, 0xd4, 0x58, 0x15, 0x46, 0x57, 0x77,
                                    0x8d, 0x9d, 0x88, 0x90, 0xd8, 0xab, 0x00,
                                    0x8c, 0xbc, 0xd3, 0x0a, 0xf7, 0xe4, 0x98,
                                    0x05, 0xb8, 0xa3, 0xb5, 0x06, 0xd0, 0x7c,
                                    0x1e, 0x8f, 0xda, 0x3f};

ProtoParseChannel::ProtoParseChannel(int channel, int sampleRate, int workMode)
{
    _channel = channel;
    _sampleRate = sampleRate;
    _workMode = workMode;
    _leftChannel = 1;
    _parseResult = NULL;
    _totalSize = 0;

    for (size_t i = 0; i < _bandNum; i++)
    {
        parseBand[i]._availSize = 0;
        parseBand[i]._bakerCodePoint = 0;
        parseBand[i]._packetLen = 0;
        parseBand[i]._totalDropSize = 0;
        // 默认10ms的数据
        parseBand[i]._unitSizeInBytes = getBytesInMs(_sampleRate, 10);
        parseBand[i]._workState = PROTO_PARSE_STATE_READY;
    }
    
    // AG-269  AC  烟感
    strcpy(_modelList[0].modelName, "R240P");
    _modelList[0].resultData = NULL;
    _modelList[0]._modeltype = _smokeType;
    _modelList[0]._powerType = AC_TYPE;
    _modelList[0]._rfType = RF_TYPE;

    // AG-269-10Y  AC  烟感
    strcpy(_modelList[1].modelName, "RSDUALP");
    _modelList[1].resultData = NULL;
    _modelList[1]._modeltype = _smokeType;
    _modelList[1]._powerType = AC_TYPE;
    _modelList[1]._rfType = RF_TYPE;

    strcpy(_modelList[2].modelName, "R10RFP");
    _modelList[2].resultData = NULL;
    _modelList[2]._modeltype = _smokeType;
    _modelList[2]._powerType = BAT_TYPE;
    _modelList[2]._rfType = RF_TYPE;

    strcpy(_modelList[3].modelName, "RFMDUAL");
    _modelList[3].resultData = NULL;
    _modelList[3]._modeltype = _smokeType;
    _modelList[3]._powerType = AC_TYPE;
    _modelList[3]._rfType = RF_TYPE;

    strcpy(_modelList[4].modelName, "Guardion Smoke Detector");
    _modelList[4].resultData = NULL;
    _modelList[4]._modeltype = _smokeType;
    _modelList[4]._powerType = BAT_TYPE;
    _modelList[4]._rfType = RF_TYPE;
}

ProtoParseChannel::~ProtoParseChannel()
{
}

void ProtoParseChannel::SetLeftChannel(int channel)
{
    _leftChannel = channel;
}

void ProtoParseChannel::DataXorEncrpytion(uint8_t *data, int len)
{
    int i, j, temp1, temp2;

    temp1 = len / 32;
    temp2 = len % 32;
    for (i = 0; i < temp1; i++)
    {
        for (j = 0; j < 32; j++)
        {
            data[i * 32 + j] ^= XorKeys[j];
        }
    }

    for (i = 0; i < temp2; i++)
    {
        data[temp1 * 32 + i] ^= XorKeys[i];
    }
}

void ProtoParseChannel::copyAlphaNum(char *dst, char *src, int len)
{
    // 字符串复制，必须要是字母或者数字才复制
    int i = 0, j = 0;
    while (i < len && src[i] != '\0')
    {
        if ((src[i] >= '0' && src[i] <= '9') || (src[i] >= 'A' && src[i] <= 'Z') || \
        (src[i] >= 'a' && src[i] <= 'z') || (src[i] == '/') || (src[i] == '_') || (src[i] == ' ') || (src[i] == '-'))
        {
            dst[j] = src[i];
            j++;
        }
        i++;
    }
    dst[j] = '\0'; // 在字符串末尾添加空字符
}

int ProtoParseChannel::getBytesInMs(int samplerate, double ms)
{
    double size = (ms * (double)samplerate * 2) / 1000;
    int sizeInt = (int)size;
    if ((sizeInt % 2) == 1)
    {
        sizeInt += 1;
    }

    return sizeInt;
}

double ProtoParseChannel::getTimeByPos(int samplerate, int64_t pos)
{
    return (double)(pos * 1000) / (double)(samplerate * 2);
}

uint16_t ProtoParseChannel::crc16_modbus(uint8_t *data, int length)
{
    uint16_t crc = 0xFFFF;
    for (int i = 0; i < length; i++)
    {
        crc ^= data[i];
        for (int j = 0; j < 8; j++)
        {
            if (crc & 0x01)
            {
                crc = (crc >> 1) ^ 0xA001;
            }
            else
            {
                crc = crc >> 1;
            }
        }
    }
    return crc;
}

int ProtoParseChannel::getCurFreq_2(int samplerate, uint8_t *data, int sampleCnt, double *amp5500, double *amp6800, double *amp0)
{
    int ret = 0;
    fftw_plan plan;
    fftw_complex *fftOutput;
    double *input;
    int size = sampleCnt;
    int fftSize = size / 2 + 1; // FFT输出的长度
    double total5500, total6800, totalOther;

    input = (double *)fftw_malloc(sizeof(double) * size);
    if (!input)
    {
        zwLogError(" [chan:%d]fftw_malloc failed...\n", _leftChannel);
        return -1;
    }
    fftOutput = (fftw_complex *)fftw_malloc(sizeof(fftw_complex) * fftSize);
    if (!fftOutput)
    {
        fftw_free(input);
        zwLogError(" [chan:%d]fftw_malloc failed...\n", _leftChannel);
        return -1;
    }

    uint8_t *samples = data;
    plan = fftw_plan_dft_r2c_1d(size, input, fftOutput, FFTW_ESTIMATE);
    if (!plan)
    {
        fftw_free(input);
        fftw_free(fftOutput);
        zwLogError(" [chan:%d]fftw_plan_dft_r2c_1d failed...\n", _leftChannel);
        return -1;
    }
    for (size_t i = 0; i < sampleCnt; i++)
    {
        int16_t sample = (int16_t)(samples[i * 2]) + ((int16_t)(samples[i * 2 + 1])) * 256;
        input[i] = (double)sample / 32767;
    }

    total5500 = total6800 = totalOther = 0.01;
    // 执行FFT
    fftw_execute(plan);
    fftw_destroy_plan(plan);
    // 统计出各个频段的强弱
    for (int i = 0; i < fftSize; ++i)
    {
        double frequency = i * ((double)samplerate / (double)size);
        #ifdef _square
        double amplitude = fftOutput[i][0] * fftOutput[i][0] + fftOutput[i][1] * fftOutput[i][1];
        #else
        double amplitude = sqrt(fftOutput[i][0] * fftOutput[i][0] + fftOutput[i][1] * fftOutput[i][1]);
        #endif

        #ifdef multi
        #ifdef _mix_mode
        if (_mixFactor == _realBand)
        {
            if ((abs(frequency - (5500 * (_doubleFactor + 1))) < 500) ||
                (abs(frequency - (5500 * (_tripleFactor + 1))) < 500))
            {
                total5500 += amplitude;
            }
            else if ((abs(frequency - (6800 * (_doubleFactor + 1))) < 500) ||
                     (abs(frequency - (6800 * (_tripleFactor + 1))) < 500))
            {
                total6800 += amplitude;
            }
            else if (frequency > (6800 * (_tripleFactor + 1) + 500))
            {
                break;
            }
        }
        else
        {
            if (abs(frequency - (5500 * (_realBand + 1))) < 500)
            {
                total5500 += amplitude;
            }
            else if (abs(frequency - (6800 * (_realBand + 1))) < 500)
            {
                total6800 += amplitude;
            }
            else if (frequency > (6800 * (_realBand + 1) + 500))
            {
                break;
            }
        }
        #else
        if (abs(frequency - (5500 * (_realBand + 1))) < 500)
        {
            total5500 += amplitude;
        }
        else if (abs(frequency - (6800 * (_realBand + 1))) < 500)
        {
            total6800 += amplitude;
        }
        else if (frequency > (6800 * (_realBand + 1) + 500))
        {
            break;
        }
        #endif
        #else
        if (abs(frequency - 5500) < 500)
        {
            total5500 += amplitude;
        }
        else if (abs(frequency - 6800) < 500)
        {
            total6800 += amplitude;
        }
        else if (frequency > 7300)
        {
            break;
        }
        #endif
    }

    if (amp5500 != NULL)
    {
        *amp5500 = total5500;
    }

    if (amp6800 != NULL)
    {
        *amp6800 = total6800;
    }

    if (amp0 != NULL)
    {
        *amp0 = totalOther;
    }

    if ((total5500 > (total6800 * 1.5)) && (total5500 > 3.0))
    {
        ret = 1;
    }
    else if ((total6800 > (total5500 * 1.5)) && (total6800 > 3.0))
    {
        ret = 0;
    }
    else
    {
        ret = -1;
    }

    // 释放内存和FFTW计划
    fftw_free(input);
    fftw_free(fftOutput);

    return ret;
}
int ProtoParseChannel::getCurFreq(int samplerate, uint8_t *data, int len, double *amp5500, double *amp6800, double *amp0, int noDrop)
{
    int prSamples = 256;
    int sampleCnt = len / 2; // 处理的就是单声道的数据
    int skipSampels = ((sampleCnt - prSamples) * 6) / 10;
    if (noDrop == 1)
    {
        skipSampels = 0;
    }
    sampleCnt = prSamples; // 只处理中间的数据

    int ret = 0;
    fftw_plan plan;
    fftw_complex *fftOutput = NULL;
    double *input = NULL;
    int size = sampleCnt;
    int fftSize = size / 2 + 1; // FFT输出的长度
    double total5500, total6800, totalOther;

    input = (double *)fftw_malloc(sizeof(double) * size);
    fftOutput = (fftw_complex *)fftw_malloc(sizeof(fftw_complex) * fftSize);

    uint8_t *samples = data;

    samples += (skipSampels * 2); // 从中间开始取数据

    plan = fftw_plan_dft_r2c_1d(size, input, fftOutput, FFTW_ESTIMATE);
    for (size_t i = 0; i < sampleCnt; i++)
    {
        int16_t sample = (int16_t)(samples[i * 2]) + ((int16_t)(samples[i * 2 + 1])) * 256;
        input[i] = (double)sample / 32767;
    }
    total5500 = total6800 = totalOther = 0.01;

    // // 执行FFT
    fftw_execute(plan);
    fftw_destroy_plan(plan);
    // // 统计出各个频段的强弱
    for (int i = 0; i < fftSize; ++i)
    {
        double frequency = i * ((double)samplerate / (double)(size - 1));

        #ifdef _square
        double amplitude = fftOutput[i][0] * fftOutput[i][0] + fftOutput[i][1] * fftOutput[i][1];
        #else
        double amplitude = sqrt(fftOutput[i][0] * fftOutput[i][0] + fftOutput[i][1] * fftOutput[i][1]);
        #endif
        #ifdef multi
        #ifdef _mix_mode
        if (_mixFactor == _realBand)
        {
            if ((abs(frequency - (5500 * (_doubleFactor + 1))) < 500) ||
                (abs(frequency - (5500 * (_tripleFactor + 1))) < 500))
            {
                total5500 += amplitude;
            }
            else if ((abs(frequency - (6800 * (_doubleFactor + 1))) < 500) ||
                     (abs(frequency - (6800 * (_tripleFactor + 1))) < 500))
            {
                total6800 += amplitude;
            }
            else if (frequency > (6800 * (_tripleFactor + 1) + 500))
            {
                break;
            }
        }
        else
        {
            if (abs(frequency - (5500 * (_realBand + 1))) < 500)
            {
                total5500 += amplitude;
            }
            else if (abs(frequency - (6800 * (_realBand + 1))) < 500)
            {
                total6800 += amplitude;
            }
            else if (frequency > (6800 * (_realBand + 1) + 500))
            {
                break;
            }
        }
        #else
        if (abs(frequency - (5500 * (_realBand + 1))) < 500)
        {
            total5500 += amplitude;
        }
        else if (abs(frequency - (6800 * (_realBand + 1))) < 500)
        {
            total6800 += amplitude;
        }
        else if (frequency > (6800 * (_realBand + 1) + 500))
        {
            break;
        }
        #endif
        #else
        if (abs(frequency - 5500) < 500)
        {
            total5500 += amplitude;
        }
        else if (abs(frequency - 6800) < 500)
        {
            total6800 += amplitude;
        }
        else if (frequency > 7300)
        {
            break;
        }
        #endif
    }

    if (amp5500 != NULL)
    {
        *amp5500 = total5500;
    }

    if (amp6800 != NULL)
    {
        *amp6800 = total6800;
    }

    if (amp0 != NULL)
    {
        *amp0 = totalOther;
    }

    #ifdef _square
    if (total5500 > total6800)
    {
        ret = 1;
    }
    else if (total6800 > total5500)
    {
        ret = 0;
    }
    #else
    if ((total5500 > (total6800 * 1.5)) || (total5500 - total6800 > 5.0))
    {
        ret = 1;
    }
    else if ((total6800 > (total5500 * 1.2)) && (total6800 > 2.0))
    {
        ret = 0;
    }
    #endif
    else
    {
        ret = -1;
    }

    // 释放内存和FFTW计划
    fftw_free(input);
    fftw_free(fftOutput);
    return ret;
}

uint16_t ProtoParseChannel::getByte(int samplerate, uint8_t *data, int unitSize, int bitsPerByte)
{
    int bitValue;
    uint16_t byteValue = 0x00;
    double ampRating0_55, ampRating0_68, ampRating0_0;
    int errCnt = 0;

    for (int i = 0; i < bitsPerByte; i++)
    {
        bitValue = getCurFreq(samplerate, data + unitSize * i, unitSize, &ampRating0_55, &ampRating0_68, &ampRating0_0);
        #if _log_level >= _detailed_log
        zwLogDbg("=>bit%d\t[%.2f,%.2f]\t%d\n", i, ampRating0_55, ampRating0_68, bitValue);
        #endif
        if (bitValue == 0)
        {
        }
        else if (bitValue == 1)
        {
            byteValue |= (0x0001 << i);
        }
        else
        {
            errCnt++;
        }
    }

    // 对数据做crc校验
    uint8_t value = (uint8_t)(byteValue >> 1);
    int crc = 0;
    for (int i = 0; i < 8; i++)
    {
        if (value & (1 << i))
        {
            crc++;
        }
    }
    // 算出奇偶性校验
    crc = crc % 2;
    if (crc != ((byteValue >> 9) & 0x01))
    {
        // zwLogDbg("bytes: 0x%02X, s:%d, e:%d, c:%d, c1:%d\n", value, byteValue&0x01, (byteValue>>10)&0x01, (byteValue>>9)&0x01, crc);
    }
    else
    {
        byteValue |= 0x4000; // crc校验没通过
        /* code */
        // if(_leftChannel == 1)
        // zwLogDbg("[chan:%d][band:%d]->invalid bytes: 0x%02X, s:%d, e:%d, odd:%d, crc:%d\n",
        //     _leftChannel, _realBand, value, byteValue&0x01, (byteValue>>10)&0x01, (byteValue>>9)&0x01, crc);
    }

    return byteValue;
}

int ProtoParseChannel::findStartFlag(int samplerate, uint8_t *data, int len, int unitSize)
{
    int bit0, bit1, bitTmp;
    double ampRating0_55, ampRating0_68, ampRating0_0;
    double ampRating1_55, ampRating1_68, ampRating1_0;

    double ampRating0_55_best, ampRating0_68_best, ampRating0_0_best;
    double ampRating1_55_best, ampRating1_68_best, ampRating1_0_best;
    int step = getBytesInMs(samplerate, 1);
    int stepOffset = -1;
    int offset = 0;

    // 获取2个bit的值，判断下降沿
    if (len < unitSize * 10)
    {
        return -2;
    }
    // 在5ms的区间开始找到最合适的开始点, 在1ms的位置开始找
    for (offset = 0; offset < unitSize * 10; offset += step)
    {
        bit0 = getCurFreq_2(samplerate, data + offset, 256, &ampRating0_55, &ampRating0_68, &ampRating0_0);
        if (bit0 != 1)
        {
            continue;
        }

        bit1 = getCurFreq_2(samplerate, data + offset + unitSize, 256, &ampRating1_55, &ampRating1_68, &ampRating1_0);
        if (bit1 != 0)
        {
            continue;
        }

        // 可能是下降沿，判断下的6.8k强度是不是太弱
        if (ampRating1_68 < ampRating0_55 / 4)
        {
            // 如果6.8太弱，再向后移动5ms看一下是不是6.8k的判断
            int nextOffset = offset + (unitSize * 3) / 2;
            // 说明这个地方是一个静音，跳过
            int bit2 = getCurFreq_2(samplerate, data + nextOffset, 256, &ampRating1_55, &ampRating1_68, &ampRating1_0);
            if (bit2 == -1)
            {
                continue;
            }
        }

        // 这个时候，bit0向后走， bit1向前走，找到最合适的位置, 1ms一次，最多走10次
        int minUnitSamples = 128;
        int bit0EndPos = -1;
        int bit1StartPos = -1, endSearchBegin;
        for (int i = 1; i < 10; i++)
        {
            bitTmp = getCurFreq_2(samplerate, data + offset + minUnitSamples * 2 * i, minUnitSamples, &ampRating0_55_best, &ampRating0_68_best, &ampRating0_0_best);
            if (bitTmp == 0)
            {
                bit0EndPos = offset + minUnitSamples * 2 * i;
                break;
            }
        }

        endSearchBegin = offset + unitSize;
        for (int i = 1; i < 10; i++)
        {
            bitTmp = getCurFreq_2(samplerate, data + endSearchBegin - i * minUnitSamples * 2, minUnitSamples, &ampRating1_55_best, &ampRating1_68_best, &ampRating1_0_best);
            if (bitTmp != 0)
            {
                bit1StartPos = endSearchBegin - i * minUnitSamples * 2;
                break;
            }
        }

        if ((bit1StartPos >= 0) && (bit0EndPos >= 0))
        {
            int bestOffset = (bit0EndPos + bit1StartPos) / 2;

            if (bestOffset & 0x01)
            {
                bestOffset += 1;
            }

            stepOffset = bestOffset;
        }
        else
        {
            stepOffset = offset + unitSize;
        }

        break;
    }
    return stepOffset;
}

int ProtoParseChannel::findHeadBytes(int samplerate, uint8_t *data, int len, int &edge1, int &edge2, int &edge3)
{
    int findResult, offset;
    int minSkipUnit = getBytesInMs(samplerate, 5);

    edge1 = findFallingEdge(samplerate, data, len);

    if (edge1 < 0)
    {
        return 0;
    }

    offset = edge1 + minSkipUnit;
    findResult = findFallingEdge(samplerate, data + offset, len - offset);
    if (findResult < 0)
    {
        return 1;
    }

    edge2 = offset + findResult;
    offset = edge2 + minSkipUnit;
    findResult = findFallingEdge(samplerate, data + offset, len - offset);
    if (findResult < 0)
    {
        return 2;
    }
    edge3 = offset + findResult;

    return 3;
}

int ProtoParseChannel::findFallingEdge(int samplerate, uint8_t *data, int len)
{
    int bit0, bit1, bitTmp;
    double ampRating0_55, ampRating0_68, ampRating0_0;
    double ampRating1_55, ampRating1_68, ampRating1_0;
    double ampRating0_55_best, ampRating0_68_best, ampRating0_0_best;
    double ampRating1_55_best, ampRating1_68_best, ampRating1_0_best;
    int step = getBytesInMs(samplerate, 1); // 每次1ms向前步进
    int stepOffset = -1;
    int offset = 0;
    int unitSize = getBytesInMs(samplerate, 10); // 这个是一个大概的位置，不需要太精确

    // 获取2个bit的值，判断下降沿
    if (len < unitSize * 2)
    {
        return -2;
    }

    // 在5ms的区间开始找到最合适的开始点, 在1ms的位置开始找
    for (offset = 0; offset < len - unitSize * 2; offset += step)
    {

        bit0 = getCurFreq_2(samplerate, data + offset, 256, &ampRating0_55, &ampRating0_68, &ampRating0_0);

        if (bit0 != 1)
        {
            continue;
        }

        bit1 = getCurFreq_2(samplerate, data + offset + unitSize, 256, &ampRating1_55, &ampRating1_68, &ampRating1_0);
        if (bit1 != 0)
        {
            continue;
        }

        // 可能是下降沿，判断下的6.8k强度是不是太弱
        if (ampRating1_68 < ampRating0_55 / 4)
        {
            // 如果6.8太弱，再向后移动5ms看一下是不是6.8k的判断
            int nextOffset = offset + (unitSize * 3) / 2;
            // 说明这个地方是一个静音，跳过
            int bit2 = getCurFreq_2(samplerate, data + nextOffset, 256, &ampRating1_55, &ampRating1_68, &ampRating1_0);
            if (bit2 == -1)
            {
                continue;
            }
        }

        // 这个时候，bit0向后走， bit1向前走，找到最合适的位置, 1ms一次，最多走10次
        int minUnitSamples = getBytesInMs(samplerate, 1);
        int bit0EndPos = -1;
        int bit1StartPos = -1, endSearchBegin;

        for (int i = 1; i < 10; i++)
        {
            bitTmp = getCurFreq_2(samplerate, data + offset + minUnitSamples * 2 * i, minUnitSamples, &ampRating0_55_best, &ampRating0_68_best, &ampRating0_0_best);
            if (bitTmp == 0)
            {
                bit0EndPos = offset + minUnitSamples * 2 * i;
                break;
            }
        }

        endSearchBegin = offset + unitSize;
        for (int i = 1; i < 10; i++)
        {
            bitTmp = getCurFreq_2(samplerate, data + endSearchBegin - i * minUnitSamples * 2, minUnitSamples, &ampRating1_55_best, &ampRating1_68_best, &ampRating1_0_best);
            if (bitTmp != 0)
            {
                bit1StartPos = endSearchBegin - i * minUnitSamples * 2;
                break;
            }
        }

        if ((bit1StartPos >= 0) && (bit0EndPos >= 0))
        {
            int bestOffset = (bit0EndPos + bit1StartPos) / 2;
            if (bestOffset & 0x01)
            {
                bestOffset += 1;
            }
            stepOffset = bestOffset;
        }
        else
        {
            stepOffset = offset + unitSize;
        }

        break;
    }

    return stepOffset;
}

void ProtoParseChannel::Reset()
{
    for (size_t i = 0; i < _bandNum; i++)
    {
        memset(&parseBand[i]._packetLen, 0, sizeof(struct _dataStream));
        parseBand[i]._unitSizeInBytes = getBytesInMs(_sampleRate, 10);
    }
    _totalSize = 0;
    *_parseResult = 0;
}

int ProtoParseChannel::GetPacket(char *buf, int length)
{
    uint8_t pktDec[128]; // 解密后的数据
    int doneBand = 0;

    for (doneBand = 0; doneBand < _bandNum; doneBand++)
    {
        if ((parseBand[doneBand]._workState == PROTO_PARSE_STATE_DONE) && (_workMode == 0))
        {
            break;
        }
    }

    if (doneBand >= _bandNum)
    {
        zwLogDbg("[chan:%d] _workState=%d...\n", _leftChannel, parseBand[doneBand]._workState);
        return -1;
    }
    if (parseBand[doneBand]._packetLen < 5)
    {
        zwLogDbg("[chan:%d] _packetLen=%d...\n", _leftChannel, parseBand[doneBand]._packetLen);
        return -2;
    }

    memcpy(pktDec, parseBand[doneBand]._packet, parseBand[doneBand]._packetLen);
    #if _log_level >= _simple_log
    zwLogRaw("[chan:%d][band:%d] bytes data:\n", _leftChannel, doneBand, __LINE__);
    for (int i = 0; i < parseBand[doneBand]._packetLen; i++)
    {
        zwLogRaw("%02X ", pktDec[i]);
    }
    zwLogRaw("\n");
    #endif
    DataXorEncrpytion(pktDec + 3, parseBand[doneBand]._packetLen - 5);
    #if _log_level >= _simple_log
    zwLogRaw("[chan:%d][band:%d] bytes data:\n", _leftChannel, doneBand, __LINE__);
    for (int i = 0; i < parseBand[doneBand]._packetLen; i++)
    {
        zwLogRaw("%02X ", pktDec[i]);
    }
    zwLogRaw("\n");
    #endif
    
    // 先判断一下长度
    if (pktDec[2] == parseBand[doneBand]._packetLen - 5)
    {
        zwLogDbg("length check passed\n");
        int _offset = 0;
        char devModel[20];
        size_t _offset1 = 0;
        memset(devModel, 0, sizeof(devModel));
        
        if(pktDec[0] == 0x1D && pktDec[1] == 0xE2)
        {
            zwLogDbg("protocol version check passed\n");
            parseBand[doneBand]._protocolVersion = pktDec[3];       //
            
            if (parseBand[doneBand]._protocolVersion == 10)//V1.0 Red
            {
                if((pktDec[4] - 1) >= RED_MODEL_NUM)         //减一是对设备侧的迁就
                return -1;

            get_device_data(_modelList[pktDec[4]-1]._powerType, _modelList[pktDec[4]-1]._rfType, pktDec, buf, length, _modelList[pktDec[4]-1]._modeltype);
            return 0;
            }
            else
            {
                #if _log_level >= _simple_log
                zwLogDbg("protocol version no support\n");
                #endif
                return -1;
            }
        }
        else
        {
            zwLogDbg("protocol version no support\n");
            return -1;
        }
    }
    else
    {
        #if _log_level >= _simple_log
        zwLogDbg("[chan:%d] invalid packet length %d\n", _leftChannel, pktDec[2]);
        #endif
        return -1;
    }

    return 0;
}

int ProtoParseChannel::VerifyPacket(unsigned char _bandx)
{
    int ret = -1;
    uint8_t pktDec[128];

    if (parseBand[_bandx]._packetLen > 0)
    {
        int actSize = parseBand[_bandx]._packet[2];

        uint16_t crc = crc16_modbus(parseBand[_bandx]._packet + 3, actSize);

        if ((parseBand[_bandx]._packet[actSize + 3] == (crc & 0xFF)) && (parseBand[_bandx]._packet[actSize + 4] == ((crc >> 8) & 0xFF)))
        {
            #if _log_level >= _simple_log
            zwLogDbg("[chan:%d][band:%d] !!!! crc1 ok..\n", _leftChannel, _bandx);
            #endif
            ret = 1;
        }
        else
        {
            #if _log_level >= _simple_log
            zwLogDbg("[chan:%d][band:%d]  crc1 error.. %x %x \n", _leftChannel, _bandx, (crc & 0xFF), ((crc >> 8) & 0xFF));
            #endif
            ret = 0;
        }
    }
    else
    {
        #if _log_level >= _simple_log
        zwLogDbg("[chan:%d][band:%d] no data for verify. packetLen=%d\n", _leftChannel, _bandx, parseBand[_bandx]._packetLen);
        #endif
    }

    return ret;
}

int ProtoParseChannel::PushBuffer(uint8_t *input, int length, int *_result)
{
    int result;
    int offset;
    int realTimeOffset;
    int dropSize;
    int minAvailSize = getBytesInMs(_sampleRate, 800); // 至少要有220ms的数据
    int startFlag = 0;
    int bitsPerByte = 11;
    int errCnt = 0;

    for (size_t i = 0; i < _bandNum; i++)
    {
        if (parseBand[i]._workState == PROTO_PARSE_STATE_DONE)
        {
            return PROTO_PARSE_STATE_REJECT;
        }
    }
    for (size_t i = 0; i < _bandNum; i++)
    {
        if (parseBand[i]._workState == PROTO_PARSE_STATE_ERROR)
        {
            errCnt++;
        }
    }
    if (errCnt >= _bandNum)
    {
        return PROTO_PARSE_STATE_ERROR;
    }

    if (length + parseBand[0]._availSize > PROTO_PARSE_SIZE)
    {
        return PROTO_PARSE_STATE_FULL;
    }

    _parseResult = _result;

    // 我们处理的永远是单声道数据，如果是多声道，转换下
    if (_channel == 2)
    {
        int dstPos = _totalSize;
        for (int i = 0; i < length; i += 4)
        {
            // 更加严格的数据检查
            if (dstPos >= PROTO_PARSE_SIZE - 4)
            {
                break;
            }

            if (_leftChannel == 1)
            {
                _data[dstPos++] = input[i];
                _data[dstPos++] = input[i + 1];
            }
            else
            {
                _data[dstPos++] = input[i + 2];
                _data[dstPos++] = input[i + 3];
            }
        }

        for (size_t i = 0; i < _bandNum; i++)
        {
            parseBand[i]._availSize += dstPos - _totalSize;
        }
        _totalSize = dstPos;
    }
    else // 暂时不维护单声道版本      !!!!!!!!!!!!!!!!!!!
    {
        int pushsize = length;
        if (pushsize + parseBand[0]._availSize > PROTO_PARSE_SIZE)
        {
            pushsize = PROTO_PARSE_SIZE - parseBand[0]._availSize;
        }

        if (pushsize > 0)
        {
            memcpy(_data + parseBand[0]._availSize, input, pushsize);
            parseBand[0]._availSize += pushsize;
        }
    }

    int edge1 = 0, edge2 = 0, edge3 = 0;
    double distance;
    double unitInMs;
    for (size_t _band = 0; _band < _bandNum; _band++)
    {
        if (parseBand[_band]._workState >= PROTO_PARSE_STATE_DONE)
        {
            continue;
        }

        offset = 0;
        _realBand = _band;
        // 死循环，处理掉里面的所有数据
        while (parseBand[_band]._availSize - offset >= minAvailSize)
        {
            // 真正的实时基准时间
            realTimeOffset = offset + parseBand[_band]._totalDropSize;

            if (parseBand[_band]._workState == PROTO_PARSE_STATE_READY)
            {
                if (parseBand[_band]._availSize - offset < getBytesInMs(_sampleRate, 400))
                {
                    // 数据不够，等待下一次
                    break;
                }
                dropSize = 0;
                // 这个时候，我们应该开始寻找包头
                edge1 = 0, edge2 = 0, edge3 = 0;
                result = findHeadBytes(_sampleRate, _data + offset + parseBand[_band]._totalDropSize, parseBand[_band]._availSize - offset, edge1, edge2, edge3);
                if (result == 3)
                {
                    distance = getTimeByPos(_sampleRate, edge3 - edge1);
                    unitInMs = distance / 22;
                    if ((unitInMs < 7.000) || (unitInMs > 15.000))  //限制时间长度，防止噪音片段干扰
                    {
                        dropSize = edge3;
                    }
                    else
                    {
                        // 为了防止误差
                        parseBand[_band]._unitSizeInBytes = getBytesInMs(_sampleRate, unitInMs);
                        // 找到完整的起始位置了
                        #if _log_level >= _appropriate_log
                        zwLogDbg("[chan:%d][band:%d]---find head edge:[%.3f][%.3f][%.3f], uintTime: %.3f ms\n",
                                 _leftChannel, _realBand,
                                 getTimeByPos(_sampleRate, edge1 + realTimeOffset) / 1000,
                                 getTimeByPos(_sampleRate, edge2 + realTimeOffset) / 1000,
                                 getTimeByPos(_sampleRate, edge3 + realTimeOffset) / 1000, unitInMs);
                        #endif
                        parseBand[_band]._bakerCodePoint = edge3 + realTimeOffset; // 保存起始点，方便二次解析

                        dropSize = edge3 + offset - parseBand[_band]._unitSizeInBytes * 2;

                        parseBand[_band]._workState = PROTO_PARSE_STATE_HEAD;
                    }
                }
                else if ((result == 2) || (result == 1))
                {
                    // 检测到下降沿，但是下降沿不够完整，继续往后找
                    if (parseBand[_band]._availSize - edge1 > getBytesInMs(_sampleRate, 400))
                    {
                        // 这个说明是一个假的起始位，扔掉edge1 + 40ms之后的所有数据
                        dropSize = parseBand[_band]._availSize - edge1 + getBytesInMs(_sampleRate, 40);
                    }
                    else
                    {
                        // 有可能只是数据不够, 扔掉edge1之前的数据
                        dropSize = edge1 - getBytesInMs(_sampleRate, 40);
                    }
                }
                else
                {
                    dropSize = parseBand[_band]._availSize - getBytesInMs(_sampleRate, 40);
                    for (size_t i = 0; i < _bandNum; i++)
                    {
                        if ((_band == i) || (parseBand[i]._bakerCodePoint == 0))
                        {
                            continue;
                        }
                        if (parseBand[_band]._totalDropSize + dropSize >= (parseBand[i]._bakerCodePoint + (44100 * 2))) //
                        {
                            #if _log_level >= _appropriate_log
                            zwLogDbg("[chan:%d][band:%d]Lag behind others... \r\n", _leftChannel, _band);
                            zwLogDbg("%.3f  %.3f  %.3f\r\n",
                                     getTimeByPos(_sampleRate, parseBand[i]._bakerCodePoint) / 1000,
                                     getTimeByPos(_sampleRate, parseBand[_band]._totalDropSize + dropSize) / 1000,
                                     getTimeByPos(_sampleRate, dropSize) / 1000);
                            #endif
                            parseBand[_band]._workState = PROTO_PARSE_STATE_ERROR; // 结束检测周期
                        }
                    }
                }

                if (dropSize > 0)
                {
                    // 修改状态，重新调整缓冲区数据
                    parseBand[_band]._totalDropSize += dropSize;
                    if (parseBand[_band]._availSize - dropSize > 0)
                    {
                        parseBand[_band]._availSize -= dropSize;
                    }
                    else
                    {
                        #if _log_level >= _appropriate_log
                        zwLogError("[chan:%d] should not be here.dropSize=%d, _availSize=%d\n", _leftChannel, dropSize, parseBand[_band]._availSize);
                        #endif
                        parseBand[_band]._availSize = 0;
                    }
                    offset = 0;
                }
                else
                {
                    #if _log_level >= _appropriate_log
                    zwLogError("[chan:%d] (2)should not be here.dropSize=%d, _availSize=%d\n", _leftChannel, dropSize, parseBand[_band]._availSize);
                    #endif
                    parseBand[_band]._availSize = 0;
                    offset = 0;
                }
            }
            else if (parseBand[_band]._workState == PROTO_PARSE_STATE_HEAD)
            {
                startFlag = findStartFlag(_sampleRate, _data + offset + parseBand[_band]._totalDropSize, parseBand[_band]._availSize - offset, parseBand[_band]._unitSizeInBytes);
                if (startFlag == -2)
                {
                    // 数据不够
                    break;
                }
                else if (startFlag == -1)
                {
                    offset += parseBand[_band]._unitSizeInBytes; // 从下一个单位开始寻找
                }
                else
                {
                    // 找到起始位了
                    offset += startFlag;
                    uint16_t byteValue;
                    byteValue = getByte(_sampleRate, _data + offset + parseBand[_band]._totalDropSize, parseBand[_band]._unitSizeInBytes, bitsPerByte);
                    if (byteValue & 0x8000)
                    {
                        // zwLogDbg("invalid bytes..!(%.3f)\n", audiobytes_getTimeByPos(samplerate, bytesOffset)/1000);
                    }
                    else if (byteValue & 0x4000)
                    {
                        #if _log_level >= _appropriate_log
                        zwLogDbg("[chan:%d][band:%d](%.3f)bytes[%d]crc failed bytes..!\n", _leftChannel, _band,
                                 getTimeByPos(_sampleRate, offset + parseBand[_band]._totalDropSize) / 1000, parseBand[_band]._packetLen);
                        #endif
                    }
                    else
                    {
                        #if _log_level >= _appropriate_log
                        // 成功的数据
                        zwLogDbg("[chan:%d][band:%d](%.3f)bytes[%d]: 0x%02X, s:%d, e:%d, c:%d\n", _leftChannel, _band,
                                 getTimeByPos(_sampleRate, offset + parseBand[_band]._totalDropSize) / 1000, parseBand[_band]._packetLen, (uint8_t)(byteValue >> 1), byteValue & 0x01, (byteValue >> 10) & 0x01, (byteValue >> 9) & 0x01);
                        #endif
                    }

                    if (parseBand[_band]._packetLen == 0)   //这里有bug，但是问题不大
                    {
                        // 必须从0x55开始计数
                        if ((uint8_t)(byteValue >> 1) != 0X1D)
                        {
// zwLogDbg("invalid bytes..!(%.3f)\n", audiobytes_getTimeByPos(_sampleRate, bytesOffset)/1000);
                            #ifdef _fast_mode
                            parseBand[_band]._workState = PROTO_PARSE_STATE_ERROR;
                            break;
                            #else
                            offset += parseBand[_band]._unitSizeInBytes * (bitsPerByte - 1);
                            continue;
                            #endif
                        }
                    }
                    #ifdef _fast_mode
                    else if (parseBand[_band]._packetLen == 1)
                    {
                        // 必须从0x55 0xAA开始计数
                        if ((uint8_t)(byteValue >> 1) != 0X1D)
                        {
                            
                            parseBand[_band]._workState = PROTO_PARSE_STATE_ERROR;
                            zwLogDbg("[chan:%d][%d](%.3f)bytes[%d]bytes is 0x%lx is not 0xAA\r\n", _leftChannel, _band,
                                     getTimeByPos(_sampleRate, offset + parseBand[_band]._totalDropSize) / 1000, parseBand[_band]._packetLen, (uint8_t)(byteValue >> 1));
                            break;
                        }
                    }
                    #endif

                    // 记录下每个字节的数据
                    if (parseBand[_band]._packetLen < PROTO_PKT_SIZE_MAX)
                    {
                        parseBand[_band]._packet[parseBand[_band]._packetLen++] = (uint8_t)(byteValue >> 1);
                    }
                    offset += parseBand[_band]._unitSizeInBytes * (bitsPerByte - 1);
                    
                    if (_workMode == 0)
                    {
                        // 真实模式，我们会做数据校验，调试模式不会做数据校验
                        if ((parseBand[_band]._packetLen > 5) && ((parseBand[_band]._packet[2] + 5) == (parseBand[_band]._packetLen)))
                        {
                            
                            if (VerifyPacket(_band) == 1)
                            {
                                #if _log_level >= _simple_log
                                zwLogDbg("[chan:%d][band:%d] verify ok..\n", _leftChannel, _band);
                                #endif
                                parseBand[_band]._workState = PROTO_PARSE_STATE_DONE;
                            }
                            else
                            {
                                #if _log_level >= _simple_log
                                zwLogDbg("[chan:%d][band:%d] verify failed..\n", _leftChannel, _band);
                                #endif
                                if (_channel == 2)
                                {
                                    if (_leftChannel == 1)
                                    {
                                        *_parseResult |= Left_Err;
                                        if ((*_parseResult & Right_Done) || (*_parseResult & Right_Err))
                                        {
                                            parseBand[_band]._workState = PROTO_PARSE_STATE_ERROR;
                                        }
                                        else
                                        {
                                            #if _log_level >= _simple_log
                                            zwLogDbg("[chan:%d][band:%d] Wait other chan\n", _leftChannel, _band);
                                            #endif
                                        }
                                    }
                                    else if (_leftChannel == 2)
                                    {
                                        *_parseResult |= Right_Err;
                                        if ((*_parseResult & Left_Done) || (*_parseResult & Left_Err))
                                        {
                                            parseBand[_band]._workState = PROTO_PARSE_STATE_ERROR;
                                        }
                                        else
                                        {
                                            #if _log_level >= _simple_log
                                            zwLogDbg("[chan:%d] Wait other chan\n", _leftChannel);
                                            #endif
                                        }
                                    }
                                }
                                else
                                {
                                    parseBand[_band]._workState = PROTO_PARSE_STATE_ERROR;
                                }
                            }
                            break;
                        }
                    }
                }
            }
        }

        if (parseBand[_band]._workState == PROTO_PARSE_STATE_HEAD)
        {
            if (offset > 0)
            {
                if (parseBand[_band]._availSize - offset > 0)
                {
                    // 修改状态，重新调整缓冲区数据
                    parseBand[_band]._totalDropSize += offset;
                    parseBand[_band]._availSize -= offset;
                }
                else
                {
                    #if _log_level >= _simple_log
                    zwLogError("[chan:%d] should not be here.offset=%d, _availSize=%d\n", _leftChannel, offset, parseBand[_band]._availSize);
                    #endif
                    parseBand[_band]._availSize = 0;
                }
            }
        }
    }

    int _stateBest = PROTO_PARSE_STATE_ERROR;
    for (size_t _band = 0; _band < _bandNum; _band++) // 目的是返回上层最高优先级的状态
    {
        if (parseBand[_band]._workState == PROTO_PARSE_STATE_DONE)
        {
            return PROTO_PARSE_STATE_DONE;
        }
        else if (parseBand[_band]._workState < _stateBest)
        {
            _stateBest = parseBand[_band]._workState;
        }
    }
    return _stateBest;
}

ProtoParse::ProtoParse(int channel, int sampleRate, int workMode)
{
    m_okChannel = 0;
    if (channel == 1)
    {
        _channel1 = new ProtoParseChannel(1, sampleRate, workMode);
        _channel2 = NULL;
    }
    else if (channel == 2)
    {
        _channel1 = new ProtoParseChannel(2, sampleRate, workMode);
        _channel2 = new ProtoParseChannel(2, sampleRate, workMode);
        _channel1->SetLeftChannel(1);
        _channel2->SetLeftChannel(2);
    }
    else
    {
        _channel1 = NULL;
        _channel2 = NULL;
    }
    m_state = PROTO_PARSE_STATE_READY;

    zwLogRaw("%s\r\n", version);
}

ProtoParse::~ProtoParse()
{
    if (_channel1 != NULL)
    {
        delete _channel1;
        _channel1 = NULL;
    }

    if (_channel2 != NULL)
    {
        delete _channel2;
        _channel2 = NULL;
    }
}

int ProtoParse::PushBuffer(uint8_t *data, int length)
{
    int state1 = PROTO_PARSE_STATE_READY;
    int result = 0;

    if (_channel1 != NULL)
    {
        state1 = _channel1->PushBuffer(data, length, &result);
        if (state1 == PROTO_PARSE_STATE_DONE)
        {
            m_okChannel = 1;
            m_state = PROTO_PARSE_STATE_DONE;
            return PROTO_PARSE_STATE_DONE;
        }
    }

    if (_channel2 != NULL)
    {
        state1 = _channel2->PushBuffer(data, length, &result);
        if (state1 == PROTO_PARSE_STATE_DONE)
        {
            m_okChannel = 2;
            m_state = PROTO_PARSE_STATE_DONE;
            return PROTO_PARSE_STATE_DONE;
        }
    }

    return state1;
}
// 重置，开启下一轮输入
void ProtoParse::Reset()
{
    if (_channel1 != NULL)
    {
        _channel1->Reset();
    }

    if (_channel2 != NULL)
    {
        _channel2->Reset();
    }

    m_okChannel = 0;
}
int ProtoParse::GetPacket(char *buf, int length)
{
    int ret = -1;
    if (_channel1 != NULL)
    {
        if (m_okChannel == 1)
        {
            ret = _channel1->GetPacket(buf, length);
        }
    }

    if (_channel2 != NULL)
    {
        if (m_okChannel == 2)
        {
            ret = _channel2->GetPacket(buf, length);
        }
    }

    return ret;
}

int ProtoParse::VerifyPacket()
{
    int ret = -1;

    if (_channel1 != NULL)
    {
        for (size_t i = 0; i < 3; i++)
        {
            ret = _channel1->VerifyPacket(i);
            if (ret == 1)
            {
                m_okChannel = 1;
                m_state = PROTO_PARSE_STATE_DONE;
            }
        }
    }

    if (_channel2 != NULL)
    {
        if (ret < 0)
        {
            for (size_t i = 0; i < 3; i++)
            {
                ret = _channel2->VerifyPacket(i);
                if (ret == 1)
                {
                    m_okChannel = 2;
                    m_state = PROTO_PARSE_STATE_DONE;
                }
            }
        }
    }

    return ret;
}

int ProtoParseChannel::get_device_data(int _powerType, int _rfType, unsigned char *data, char *buf, int length, int _deviceType)
{
    int devStatus = 0; // 设备状态
    int offset = 0;
    int i = 4;
    int _year = 0;
    int _month = 0;
    int _day = 0;
    unsigned char battery_level = 0;
    unsigned char dust_level = 0;
    unsigned long _SN = 0;
    unsigned char _protocolVersion = 0, _week = 0, _pid = 0; //协议版本号
    _protocolVersion = data[3];

    if (_protocolVersion != 10)
    {
        return -1;
    }
    

    offset += snprintf(buf + offset, length - offset - 1, "{");

    offset += snprintf(buf + offset, length - offset - 1, "\"model_no\":\"%s\",", _modelList[data[i] - 1].modelName);
    i++;
    
    _year = data[i + 1] >> 1;
    _month = ((data[i + 1] & 0x01) << 3) + (data[i] >> 5);
    _day = data[i] & 0x1F;
    i+=2;

    _SN = data[i] + ((uint16_t)data[i + 1] << 8) + ((uint32_t)(data[i + 2]) << 16) + ((uint32_t)(data[i + 3] & 0x0F) << 24);

    offset += snprintf(buf + offset, length - offset - 1, "\"SN\":\"%ld\",", _SN);
    offset += snprintf(buf + offset, length - offset - 1, "\"date\":\"20%02d-%02d-%02d\",", _year, _month, _day);
    i += 4;
    
    
    offset += snprintf(buf + offset, length - offset - 1, "\"duration\":%d,", getInt16(data, i));
    i += 2;

    devStatus = getInt16(data, i);
    offset += snprintf(buf + offset, length - offset - 1, "\"sensor_status\":%d,", (devStatus >> 15) & 0x0001);
    battery_level = (devStatus >> 12) & 0x0007;
    if(battery_level <= 1)
        battery_level = 1;
    else if(battery_level >= 4)
        battery_level = 4;
    offset += snprintf(buf + offset, length - offset - 1, "\"battery_level\":%d,", battery_level);

    double battery = (double)(devStatus & 0x03FF) / 100.0;
    offset += snprintf(buf + offset, length - offset - 1, "\"battery\":%.2f,", battery);
    i += 2;


    dust_level = data[i];
    offset += snprintf(buf + offset, length - offset - 1, "\"dust_level\":%d,", dust_level);
    i += 1;

    if (_powerType)
    {
        offset += snprintf(buf + offset, length - offset - 1, "\"main_power_status\":%d,", (devStatus >> 11) & 0x0001);
        offset += snprintf(buf + offset, length - offset - 1,
                           "\"main_power_events\": {\"times\": %d, \"last_time\": %d},", getInt16(data, i), getInt16(data, i + 2));
        i += 4;

        offset += snprintf(buf + offset, length - offset - 1,
                           "\"Wrong_Wiring_events\": {\"times\": %d, \"last_time\": %d},", getInt16(data, i), getInt16(data, i + 2));
        i += 4;

        offset += snprintf(buf + offset, length - offset - 1,
                           "\"Wire_Interconnect_events\": {\"times\": %d, \"last_time\": %d},", getInt16(data, i), getInt16(data, i + 2));        
        i += 4;
    }

    if (_rfType)
    {
        offset += snprintf(buf + offset, length - offset - 1,
                           "\"Interconnect_events\": {\"times\": %d, \"last_time\": %d},", getInt16(data, i), getInt16(data, i + 2));
        i += 4;
    }

    offset += snprintf(buf + offset, length - offset - 1,
                       "\"low_battery_events\": {\"warning_beeps\": %d, \"last_beep\": %d},", getInt16(data,  i), getInt16(data,  i + 2));
    i += 4;


    offset += snprintf(buf + offset, length - offset - 1,
                       "\"test_button_pressed\": {\"times\": %d, \"last_time\": %d},", getInt16(data,  i), getInt16(data, i + 2));
    i += 4;


    offset += snprintf(buf + offset, length - offset - 1,
                       "\"times_alarm_deactivated\": {\"times\": %d, \"last_time\": %d},", getInt16(data, i), getInt16(data,i + 2));
    i += 4;

    if(_deviceType == _COType || _deviceType == _COHeatType)
    {
        offset += snprintf(buf + offset, length - offset - 1, "\"co_concentration\":{");
        offset += snprintf(buf + offset, length - offset - 1, "\"high\": {\"activations\": %d, \"last_event\": %d},", getInt16(data, i), getInt16(data, i + 2));
        i += 4;
        offset += snprintf(buf + offset, length - offset - 1, "\"medium\": {\"activations\": %d, \"last_event\": %d},", getInt16(data, i), getInt16(data, i + 2));
        i += 4;
        offset += snprintf(buf + offset, length - offset - 1, "\"low\": {\"activations\": %d, \"last_event\": %d}", getInt16(data,  i), getInt16(data, i + 2));
        i += 4;
        offset += snprintf(buf + offset, length - offset - 1, "},");

        offset += snprintf(buf + offset, length - offset - 1,
                        "\"peak_co_level\": {\"level\": %d, \"last_time\": %d},", getInt16(data,  i), getInt16(data,i + 2));
        i += 4;
        offset += snprintf(buf + offset, length - offset - 1, "\"present_co\":%d,", getInt16(data,  i));
        i += 2;
        offset += snprintf(buf + offset, length - offset - 1, "\"background_co\": {\"exposure\": %d, \"last\": %d}", getInt16(data, i), getInt16(data,  i + 2));
        i += 4;
        if(_deviceType == _COHeatType)
        {
            offset += snprintf(buf + offset, length - offset - 1, ",");
        }
    }

    if(_deviceType == _smokeType || _deviceType == _smokeHeatType)
    {
        offset += snprintf(buf + offset, length - offset - 1,
                       "\"smoke_alarm\": {\"times\": %d, \"last_time\": %d}", getInt16(data, i), getInt16(data,i + 2));
        i += 4;
        if(_deviceType == _smokeHeatType)
        {
            offset += snprintf(buf + offset, length - offset - 1, ",");
        }
    }

    if(_deviceType == _COHeatType || _deviceType == _smokeHeatType || _deviceType == _heatType)
    {
        
        offset += snprintf(buf + offset, length - offset - 1,
                       "\"heat_alarm\": {\"times\": %d, \"last_time\": %d}", getInt16(data,  i), getInt16(data, i + 2));
        i += 4;
    }

    offset += snprintf(buf + offset, length - offset - 1, "}");
    
    return 0;
}

