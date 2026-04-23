#ifndef __ZW_LOG_H__
#define __ZW_LOG_H__

#include <stdio.h>

#ifdef AUDIO_PARSER_VERBOSE
#define zwLogError(...) fprintf(stderr, __VA_ARGS__)
#define zwLogDbg(...)   fprintf(stderr, __VA_ARGS__)
#define zwLogRaw(...)   fprintf(stderr, __VA_ARGS__)
#else
#define zwLogError(...) do {} while (0)
#define zwLogDbg(...)   do {} while (0)
#define zwLogRaw(...)   do {} while (0)
#endif

#endif
