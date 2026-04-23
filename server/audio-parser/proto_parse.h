#ifndef __PROTO_PARSE_H__
#define __PROTO_PARSE_H__

#include <stdint.h>
#include <stdio.h>
#include "zwLog.h"

#define PROTO_PARSE_SIZE (1024*1024*3)
#define PROTO_PKT_SIZE_MAX   256
#define MODEL_NO_Number     (12)

#define RED_MODEL_NUM    (5)    //Red系列型号数量

#define BAT_TYPE            (0)
#define AC_TYPE             (1)

#define LINE_TYPE             (0)
#define RF_TYPE               (1)

#define _COType             (0)
#define _smokeType          (1)
#define _heatType           (2)
#define _COHeatType         (3)
#define _smokeHeatType      (4)


// #define _fast_mode                   //该模式可能影响用户感知，故只用于debug
#define multi
#define _mix_mode
//------------log 
#define _log_level          (_detailed_log)         //Select the level of logging you want

#define _disable_log        (0)         //No logging at all
#define _simple_log         (1)         //Simple log that only outputs parsing results
#define _appropriate_log    (2)         //ppropriate logging 
#define _detailed_log       (3)         //record the details of the detec tion
//------------

#define Left_Done           (0x80)
#define Left_Err            (0x40)
#define Right_Done          (0x08)
#define Right_Err           (0x04)

class ProtoParseChannel;
struct RESULT_STRUCT
{
    char modelName[25];
    int (ProtoParseChannel::* resultData)(int _powerType,unsigned char *data, char* buf, int length);
    int _modeltype;
    int _powerType;
    int _rfType;
};

class ProtoParseChannel
{
public:
    //默认实时模式，
    ProtoParseChannel(int channel, int sampleRate, int workMode = 0);
    ~ProtoParseChannel();
    
    enum{
        PROTO_PARSE_STATE_READY = 0, //空闲中
        PROTO_PARSE_STATE_FULL,  //缓冲区满了，这个包不收
        PROTO_PARSE_STATE_HEAD, //已经解析到了头信息
        PROTO_PARSE_STATE_DONE, //CRC校验通过，找到了
        PROTO_PARSE_STATE_ERROR, //CRC校验失败了
        PROTO_PARSE_STATE_REJECT, //拒绝接受了，你还没取走数据X
    };

    void SetLeftChannel(int channel);
    int PushBuffer(uint8_t* data, int length, int *_result);
    //重置，开启下一轮输入
    void Reset();
    int GetPacket(char* buf, int length);
    int VerifyPacket(unsigned char _bandx);
    int getBytesInMs(int samplerate, double ms);
    
private:
    void DataXorEncrpytion(uint8_t* data, int len);

    void copyAlphaNum(char* dst, char* src, int len);
    
    double getTimeByPos(int samplerate, int64_t pos);
    uint16_t crc16_modbus(uint8_t* data, int length);

    int getCurFreq_2(int samplerate, uint8_t* data, int sampleCnt, double* amp5500, double* amp6800,double* amp0);
    int getCurFreq(int samplerate, uint8_t* data, int len, double* amp5500 = NULL, double* amp6800 = NULL, double* amp0 = NULL, int noDrop = 0);
    
    uint16_t getByte(int samplerate, uint8_t* data, int unitSize, int bitsPerByte);
    int findStartFlag(int samplerate, uint8_t* data, int len, int unitSize);

    int findHeadBytes(int samplerate, uint8_t* data, int len, int& edge1, int& edge2, int& edge3);

    int findFallingEdge(int samplerate, uint8_t* data, int len);

    int get_device_data(int _powerType,int _rfType, unsigned char *data, char* buf, int length, int _deviceType);
private:
    uint8_t _data[PROTO_PARSE_SIZE];

    enum bandFactor
    {
        _baseFactor = 0,            //
        _doubleFactor,
        _tripleFactor,
        #ifdef  _mix_mode
        _mixFactor,                 //
        #endif
        // _quarticFactor,
        _bandNum,
    };

    struct _dataStream              //
    {
        /* data */
        int _packetLen;             //解析到的数据长度
        int _totalDropSize;         //处理过的数据
        int _availSize;             //未处理的数据量
        int _unitSizeInBytes;       //单位字节时间长度
        int _workState;             //解析步骤
        // int _parseResult;        //解析结果
        int _bakerCodePoint;        //找到同步码的位置
        int _protocolVersion;       //协议版本
        int _deviceType;     //
        unsigned char _packet[PROTO_PKT_SIZE_MAX];    //解包数据

    };

    struct RESULT_STRUCT _modelList[RED_MODEL_NUM];

    //common
    int _channel;                   //音频声道数
    int _sampleRate;
    int _totalSize;                 //已导入的总数据量
    int _workMode;                  //0:实时模式，1调试模式
    int _leftChannel;               //当前声道
    int *_parseResult;              //声道解析结果
    int _realBand;                  //现在是在哪个频带，debug用
    struct _dataStream parseBand[_bandNum];//频带检测
};

class ProtoParse
{
public:
    //默认实时模式，
    ProtoParse(int channel, int sampleRate, int workMode = 0);
    ~ProtoParse();
    
    enum{
        PROTO_PARSE_STATE_READY = 0, //空闲中
        PROTO_PARSE_STATE_FULL,  //缓冲区满了，这个包不收
        PROTO_PARSE_STATE_HEAD, //已经解析到了头信息
        PROTO_PARSE_STATE_DONE, //CRC校验通过，找到了
        PROTO_PARSE_STATE_ERROR, //CRC校验失败了
        PROTO_PARSE_STATE_REJECT, //拒绝接受了，你还没取走数据X
    };
    
    int PushBuffer(uint8_t* data, int length);
    //重置，开启下一轮输入
    void Reset();
    int GetPacket(char* buf, int length);
    int VerifyPacket();

    
private:
    ProtoParseChannel* _channel1;
    ProtoParseChannel* _channel2;
    int m_state;
    
    int m_okChannel;
};

//ProtoParse -> ProtoParseChannel

#endif // __PROTO_PARSE_H__
