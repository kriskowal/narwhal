// Copyright 2009 Ryan Dahl <ry@tinyclouds.org>
#ifndef SRC_FILE_H_
#define SRC_FILE_H_

#include <node.h>
#include <node_events.h>
#include <v8.h>

namespace node {

class File {
 public:
  static void Initialize(v8::Handle<v8::Object> target);
  static v8::Handle<v8::Value> ReadInto(const v8::Arguments& args);
  static v8::Handle<v8::Value> WriteFrom(const v8::Arguments& args);
};

}  // namespace node
#endif  // SRC_FILE_H_
