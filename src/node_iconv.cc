// -- kriskowal Kris Kowal Copyright (C) 2010 MIT License
#include <node_iconv.h>
#include <narwhal_buffer.h>
#include <errno.h> // errno
#include <string.h> // strerror

namespace node {

using namespace narwhal; // for Buffer
using namespace v8;

Persistent<FunctionTemplate> Transcoder::constructor_template;
static Persistent<String> errno_symbol;

static inline Local<Value> ErrnoException(int errorno) {
  Local<Value> error = Exception::Error(String::NewSymbol(
    strerror(errorno)));
  Local<Object> object = error->ToObject();
  object->Set(errno_symbol, Integer::New(errorno));
  return error;
}

// sourceCharset, targetCharset
Handle<Value> Transcoder::New(const Arguments &args) {
  HandleScope scope;
  Handle<Object> that = args.This();
  Transcoder *transcoder;
  Handle<String> sourceString, targetString;
  char *source, *target;

  if (!Transcoder::HasInstance(that))
    return ThrowException(String::New("Transcoder must be constructed "
      "with 'new'"));

  if (args[0]->IsUndefined())
    return ThrowException(String::New("Transcoder must be constructed with "
      "a source charset"));
  if (args[1]->IsUndefined())
    return ThrowException(String::New("Transcoder must be constructed with "
      "a target charset"));

  // source charset string
  sourceString = args[0]->ToString();
  source = new char[sourceString->Length() + 1];
  if (!sourceString->WriteAscii(source)) {
    delete source;
    return ThrowException(String::New("Source charset must be an ASCII "
      "value"));
  }

  // target charset string
  targetString = args[1]->ToString();
  target = new char[targetString->Length() + 1];
  if (!targetString->WriteAscii(target)) {
    delete source;
    delete target;
    return ThrowException(String::New("Source charset must be an ASCII "
      "value"));
  }

  iconv_t descriptor = iconv_open(source, target);
  delete source;
  delete target;

  if (descriptor == (iconv_t)-1)
    return ThrowException(String::New("Cannot construct a Transcoder for "
      "the given charsets"));

  transcoder = new Transcoder();
  transcoder->descriptor_ = descriptor;
  transcoder->Wrap(that);

  return that;
}

// source, target, source_start, source_stop, target_start, target_stop
Handle<Value> Transcoder::Transcode(const Arguments &args) {
  HandleScope scope;
  Transcoder *transcoder;

  if (!Transcoder::HasInstance(args.This()))
    return ThrowException(String::New("Transcoder.prototype.transcode "
      "must receive a Transcoder object as 'this'"));
  transcoder = ObjectWrap::Unwrap<Transcoder>(args.This());
  iconv_t descriptor = transcoder->descriptor_;

  /*
  if (!Buffer::HasInstance(args[0]))
    return ThrowException(String::New("Transcoder.prototype.transcode must "
      "receive a Buffer object as arguments[0]."));
    */
  Buffer *source = ObjectWrap::Unwrap<Buffer>(args[0]->ToObject());

  /*
  if (!Buffer::HasInstance(args[1]))
    return ThrowException(String::New("Transcoder.prototype.transcode "
      "must receive a Buffer object as arguments[1]."));
    */
  Buffer *target = ObjectWrap::Unwrap<Buffer>(args[1]->ToObject());

  // source start
  size_t source_start;
  if (args[2]->IsInt32()) {
    source_start = args[2]->Int32Value();
    if (source_start < 0 || source_start > source->length()) {
      return ThrowException(String::New("transcode() sourceStart out of bounds"));
    }
  } else {
    source_start = 0;
  }

  // source stop
  size_t source_stop;
  if (args[3]->IsInt32()) {
    source_stop = args[3]->Int32Value();
    if (source_stop < 0 || source_stop > source->length()) {
      return ThrowException(String::New("transcode() sourceStop out of bounds"));
    }
  } else {
    source_stop = source->length();
  }

  // target start
  size_t target_start;
  if (args[4]->IsInt32()) {
    target_start = args[4]->Int32Value();
    if (target_start < 0 || target_start > target->length()) {
      return ThrowException(String::New("transcode() targetStart out of bounds"));
    }
  } else {
    target_start = 0;
  }

  // target stop
  size_t target_stop;
  if (args[5]->IsInt32()) {
    target_stop = args[5]->Int32Value();
    if (target_stop < 0 || target_stop > target->length()) {
      return ThrowException(String::New("transcode() targetStop out of bounds"));
    }
  } else {
    target_stop = target->length();
  }

  char *source_data = source->data() + source_start;
  char *target_data = target->data() + target_start;
  size_t source_capacity = source_stop - source_start;
  size_t target_capacity = target_stop - target_start;

  size_t converted = iconv(
    descriptor,
    &source_data, &source_capacity, 
    &target_data, &target_capacity
  );

  const char *error = 0;
  if (converted < 0) {
    if (errno == E2BIG) {
      error = "resize";
      //return ThrowException(String::New("There is not sufficient room "
      // "in the target buffer");
    } else if (errno == EILSEQ) {
      error = "invalid";
      //return ThrowException(String::New("An invalid multi-byte sequence "
      //"has been encountered in the souce buffer");
    } else if (errno == EINVAL) {
      error = "incomplete";
      //return ThrowException(String::New("An incomplete multibyte sequence "
      //"has been encountered in the source buffer");
    } else {
      //return ThrowException(ErrnoException(errno));
    }
  }

  Local<Object> result = Object::New();
  result->Set(String::New("source"), Integer::NewFromUnsigned(
      source_stop - source_capacity
  )); // source
  result->Set(String::New("target"), Integer::NewFromUnsigned(
      target_stop - target_capacity
  )); // target
  result->Set(String::New("converted"), Integer::NewFromUnsigned(
      converted
  )); // converted
  if (error)
    result->Set(String::New("error"), String::New(error)); // error

  return scope.Close(result);
}

// target, start, stop
// flushes a reset sequence, closes, returns bytes written
Handle<Value> Transcoder::Close(const Arguments &args) {
  HandleScope scope;
  Transcoder *transcoder;

  if (!Transcoder::HasInstance(args.This()))
    return ThrowException(String::New("Transcoder.prototype.close must "
      "receive a Transcoder object as 'this'"));

    /*
  Buffer *target;
  if (!args[0]->IsUndefined()) {
    if (!Buffer::HasInstance(args[0]))
      return ThrowException(String::New("Transcoder.prototype.transcode "
        "must receive a Buffer object as arguments[0]."));
    target = ObjectWrap::Unwrap<Buffer>(args[0]->ToObject());
  } else {
  }
  */

  transcoder = ObjectWrap::Unwrap<Transcoder>(args.This());
  iconv_close(transcoder->descriptor_);

  return args.This();
}

void Transcoder::Initialize(Handle<Object> target) {
  HandleScope scope;

  errno_symbol = NODE_PSYMBOL("errno");

  // function Transcoder () {}
  Local<FunctionTemplate> transcoder_new = FunctionTemplate::New(
    Transcoder::New);
  constructor_template = Persistent<FunctionTemplate>::New(transcoder_new);
  constructor_template->InstanceTemplate()->SetInternalFieldCount(1);
  constructor_template->SetClassName(String::NewSymbol("Transcoder"));

  // Transcoder.prototype
  NODE_SET_PROTOTYPE_METHOD(constructor_template, "transcode",
    Transcoder::Transcode);
  NODE_SET_PROTOTYPE_METHOD(constructor_template, "close",
    Transcoder::Close);

  // target.Transcoder = Transcoder
  target->Set(String::NewSymbol("Transcoder"),
    constructor_template->GetFunction());

}

}

