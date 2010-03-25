// kriskowal Kris Kowal Copyright (c) 2010 MIT License
#ifndef NARWHAL_OS_H_
#define NARWHAL_OS_H_

#include <node.h>
#include <v8.h>

namespace narwhal {

class Os {
 public:
  static void Initialize(v8::Handle<v8::Object> target);
};
 
}

#endif // ndef NARWHAL_OS_H_
