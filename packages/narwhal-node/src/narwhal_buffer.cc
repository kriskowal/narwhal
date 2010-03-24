// by Ryan Dahl
// renamed to narwhal_buffer.* so merge conflicts will be avoided
// when node_buffer.* lands.
#include <narwhal_buffer.h>

#include <assert.h>
#include <stdlib.h> // malloc, free
#include <string.h> // memcpy, memmove
#include <arpa/inet.h>  // htons, htonl
#include <iconv.h>

#include <v8.h>
#include <node.h>

namespace narwhal {

using namespace node;
using namespace v8;

#define SLICE_ARGS(start_arg, stop_arg)                              \
  if (!start_arg->IsInt32() || !stop_arg->IsInt32()) {               \
    return ThrowException(Exception::TypeError(                      \
          String::New("Bad argument.")));                            \
  }                                                                  \
  int32_t start = start_arg->Int32Value();                           \
  int32_t stop = stop_arg->Int32Value();                             \
  if (start < 0 || stop < 0) {                                       \
    return ThrowException(Exception::TypeError(                      \
          String::New("Bad argument.")));                            \
  }                                                                  \
  if (!(start <= stop)) {                                            \
    return ThrowException(Exception::Error(                          \
          String::New("Must have start <= stop")));                  \
  }                                                                  \
  if ((size_t)stop > parent->length_) {                              \
    return ThrowException(Exception::Error(                          \
          String::New("stop cannot be longer than parent.length"))); \
  }

Persistent<FunctionTemplate> Buffer::constructor_template;
static Persistent<String> length_symbol;



// Each javascript Buffer object is backed by a Blob object.
// the Blob is just a C-level chunk of bytes.
// It has a reference count.
struct Blob_ {
  unsigned int refs;
  size_t length;
  char data[1];
};
typedef struct Blob_ Blob;


static inline Blob * blob_new(size_t length) {
  size_t s = sizeof(Blob) - 1 + length;
  Blob * blob  = (Blob*) malloc(s);
  if (!blob) return NULL;
  V8::AdjustAmountOfExternalAllocatedMemory(s);
  blob->length = length;
  blob->refs = 0;
  //fprintf(stderr, "alloc %d bytes\n", length);
  return blob;
}


static inline void blob_ref(Blob *blob) {
  blob->refs++;
}


static inline void blob_unref(Blob *blob) {
  assert(blob->refs > 0);
  if (--blob->refs == 0) {
    //fprintf(stderr, "free %d bytes\n", blob->length);
    size_t s = sizeof(Blob) - 1 + blob->length;
    V8::AdjustAmountOfExternalAllocatedMemory(-s);
    free(blob);
  }
}


// When someone calls buffer.asciiRange, data is not copied. Instead V8
// references in the underlying Blob with this ExternalAsciiStringResource.
class AsciiRangeExt: public String::ExternalAsciiStringResource {
 friend class Buffer;
 public:
  AsciiRangeExt(Buffer *parent, size_t start, size_t stop) {
    blob_ = parent->blob();
    blob_ref(blob_);

    assert(start <= stop);
    length_ = stop - start;
    assert(length_ <= parent->length());
    data_ = parent->data() + start;
  }


  ~AsciiRangeExt() {
    //fprintf(stderr, "free ascii slice (%d refs left)\n", blob_->refs);
    blob_unref(blob_);
  }


  const char* data() const { return data_; }
  size_t length() const { return length_; }

 private:
  const char *data_;
  size_t length_;
  Blob *blob_;
};


// length, fill_opt
// buffer, start_opt, stop_opt
// defer to pure javascript:
//     array, start_opt, stop_opt
//     string, charset
Handle<Value> Buffer::New(const Arguments &args) {
  HandleScope scope;
  Buffer *buffer;

  Handle<Object> that;
  if (Buffer::HasInstance(args.This())) {
      that = args.This();
  } else {
      return ThrowException(String::New("Buffer must be constructed with "
        "'new'"));
  }

  if (args[0]->IsInt32()) {
    size_t length = args[0]->Uint32Value();
    buffer = new Buffer(length);
    char fill = char(args[1]->Uint32Value());
    for (char *at = buffer->data(); at < buffer->data() + buffer->length(); at++) {
      *at = fill;
    }
  } else if (Buffer::HasInstance(args[0]) && args.Length() > 2) {
    // var slice = new Buffer(buffer, 123, 130);
    // args: parent, start, stop
    Buffer *parent = ObjectWrap::Unwrap<Buffer>(args[0]->ToObject());

    // start
    uint32_t start;
    if (args[1]->IsUndefined())
      start = 0;
    else if (args[1]->IsInt32())
      start = args[1]->Int32Value();
    else
      return ThrowException(String::New("Buffer() arguments[1] 'start' "
        "must be a Number if it is defined"));

    // stop
    uint32_t stop;
    if (args[2]->IsUndefined())
      stop = parent->length();
    else if (args[2]->IsInt32())
      stop = args[2]->Int32Value();
    else
      return ThrowException(String::New("Buffer() arguments[2] 'stop' must "
        "be a Number if it is defined"));

    if (start < 0 || start > parent->length())
      return ThrowException(String::New("Buffer() arguments[2] 'start' must "
          " be within the bounds of the parent buffer."));
    if (stop < 0 || stop > parent->length())
      return ThrowException(String::New("Buffer() arguments[2] 'stop' must "
          " be within the bounds of the parent buffer."));

    buffer = new Buffer(parent, start, stop);

  } else {
    return ThrowException(Exception::TypeError(String::New("Bad argument")));
  }

  buffer->Wrap(that);
  that->SetIndexedPropertiesToExternalArrayData((void*)buffer->data_,
                                                       kExternalUnsignedByteArray,
                                                       buffer->length_);
  that->Set(length_symbol, Integer::New(buffer->length_));
  return that;
}


Buffer::Buffer(size_t length) : ObjectWrap() {
  blob_ = blob_new(length);
  length_ = length;
  data_ = blob_->data;
  blob_ref(blob_);

  V8::AdjustAmountOfExternalAllocatedMemory(sizeof(Buffer));
}


Buffer::Buffer(Buffer *parent, size_t start, size_t stop) : ObjectWrap() {
  blob_ = parent->blob_;
  assert(blob_->refs > 0);
  blob_ref(blob_);

  assert(start <= stop);
  length_ = stop - start;
  assert(length_ <= parent->length_);
  data_ = parent->data_ + start;

  V8::AdjustAmountOfExternalAllocatedMemory(sizeof(Buffer));
}


Buffer::~Buffer() {
  assert(blob_->refs > 0);
  //fprintf(stderr, "free buffer (%d refs left)\n", blob_->refs);
  blob_unref(blob_);
  V8::AdjustAmountOfExternalAllocatedMemory(-sizeof(Buffer));
}


Handle<Value> Buffer::AsciiRange(const Arguments &args) {
  HandleScope scope;
  Buffer *parent = ObjectWrap::Unwrap<Buffer>(args.This());

  // start
  uint32_t start;
  if (args[0]->IsUndefined())
    start = 0;
  else if (args[0]->IsInt32())
    start = args[0]->Int32Value();
  else
    return ThrowException(String::New("asciiRange() arguments[0] 'start' "
      "must be a Number if it is defined"));

  // stop
  uint32_t stop;
  if (args[1]->IsUndefined())
    stop = parent->length();
  else if (args[1]->IsInt32())
    stop = args[1]->Int32Value();
  else
    return ThrowException(String::New("asciiRange() arguments[1] 'stop' must "
      "be a Number if it is defined"));

  if (start < 0 || start > parent->length())
    return ThrowException(String::New("Buffer() arguments[2] 'start' must "
        " be within the bounds of the parent buffer."));
  if (stop < 0 || stop > parent->length())
    return ThrowException(String::New("Buffer() arguments[2] 'stop' must "
        " be within the bounds of the parent buffer."));

  AsciiRangeExt *ext = new AsciiRangeExt(parent, start, stop);
  Local<String> string = String::NewExternal(ext);
  // There should be at least two references to the blob now - the parent
  // and the slice.
  assert(parent->blob_->refs >= 2);
  return scope.Close(string);
}


Handle<Value> Buffer::Utf8Slice(const Arguments &args) {
  HandleScope scope;
  Buffer *parent = ObjectWrap::Unwrap<Buffer>(args.This());

  // start
  uint32_t start;
  if (args[0]->IsUndefined())
    start = 0;
  else if (args[0]->IsInt32())
    start = args[0]->Int32Value();
  else
    return ThrowException(String::New("utf8Slice() arguments[0] 'start' "
      "must be a Number if it is defined"));

  // stop
  uint32_t stop;
  if (args[1]->IsUndefined())
    stop = parent->length();
  else if (args[1]->IsInt32())
    stop = args[1]->Int32Value();
  else
    return ThrowException(String::New("utf8Slice() arguments[1] 'stop' must "
      "be a Number if it is defined"));

  if (start < 0 || start > parent->length())
    return ThrowException(String::New("Buffer() arguments[2] 'start' must "
        " be within the bounds of the parent buffer."));
  if (stop < 0 || stop > parent->length())
    return ThrowException(String::New("Buffer() arguments[2] 'stop' must "
        " be within the bounds of the parent buffer."));

  const char *data = reinterpret_cast<const char*>(parent->data_ + start);
  Local<String> string = String::New(data, stop - start);
  return scope.Close(string);
}


Handle<Value> Buffer::Range(const Arguments &args) {
  HandleScope scope;
  Local<Value> argv[3] = { args.This(), args[0], args[1] };
  Local<Object> slice =
    constructor_template->GetFunction()->NewInstance(3, argv);
  return scope.Close(slice);
}


// var charsWritten = buffer.utf8Write(string, offset);
Handle<Value> Buffer::Utf8Write(const Arguments &args) {
  HandleScope scope;
  Buffer *buffer = ObjectWrap::Unwrap<Buffer>(args.This());

  if (!args[0]->IsString()) {
    return ThrowException(Exception::TypeError(String::New(
            "Argument must be a string")));
  }

  Local<String> s = args[0]->ToString();

  size_t offset = args[1]->Int32Value();

  if (offset > buffer->length_) {
    return ThrowException(Exception::TypeError(String::New(
            "Offset is out of bounds")));
  }

  const char *p = buffer->data_ + offset;

  if (s->Length() + offset > buffer->length_) {
    return ThrowException(Exception::TypeError(String::New(
            "Not enough space in Buffer for string")));
  }

  int written = s->WriteUtf8((char*)p);
  return scope.Close(Integer::New(written - 1));
}


// var charsWritten = buffer.asciiWrite(string, offset);
Handle<Value> Buffer::AsciiWrite(const Arguments &args) {
  HandleScope scope;

  Buffer *buffer = ObjectWrap::Unwrap<Buffer>(args.This());

  if (!args[0]->IsString()) {
    return ThrowException(Exception::TypeError(String::New(
            "Argument must be a string")));
  }

  Local<String> s = args[0]->ToString();

  size_t offset = args[1]->Int32Value();

  if (offset > buffer->length_) {
    return ThrowException(Exception::TypeError(String::New(
            "Offset is out of bounds")));
  }

  const char *p = buffer->data_ + offset;

  if (s->Length() + offset > buffer->length_) {
    return ThrowException(Exception::TypeError(String::New(
            "Not enough space in Buffer for string")));
  }

  int written = s->WriteAscii((char*)p);
  return scope.Close(Integer::New(written));
}


// buffer.unpack(format, index);
// Starting at 'index', unpacks binary from the buffer into an array.
// 'format' is a string
//
//  FORMAT  RETURNS
//    N     uint32_t   a 32bit unsigned integer in network byte order
//    n     uint16_t   a 16bit unsigned integer in network byte order
//    o     uint8_t    a 8bit unsigned integer
Handle<Value> Buffer::Unpack(const Arguments &args) {
  HandleScope scope;
  Buffer *buffer = ObjectWrap::Unwrap<Buffer>(args.This());

  if (!args[0]->IsString()) {
    return ThrowException(Exception::TypeError(String::New(
            "Argument must be a string")));
  }

  String::AsciiValue format(args[0]->ToString());
  int index = args[1]->IntegerValue();

#define OUT_OF_BOUNDS ThrowException(Exception::Error(String::New("Out of bounds")))

  Local<Array> array = Array::New(format.length());

  uint8_t  uint8;
  uint16_t uint16;
  uint32_t uint32;

  for (int i = 0; i < format.length(); i++) {
    switch ((*format)[i]) {
      // 32bit unsigned integer in network byte order
      case 'N':
        if (index + 3 >= buffer->length_) return OUT_OF_BOUNDS;
        uint32 = htonl(*(uint32_t*)(buffer->data_ + index));
        array->Set(Integer::New(i), Integer::NewFromUnsigned(uint32));
        index += 4;
        break;

      // 16bit unsigned integer in network byte order
      case 'n':
        if (index + 1 >= buffer->length_) return OUT_OF_BOUNDS;
        uint16 = htons(*(uint16_t*)(buffer->data_ + index));
        array->Set(Integer::New(i), Integer::NewFromUnsigned(uint16));
        index += 2;
        break;

      // a single octet, unsigned.
      case 'o':
        if (index >= buffer->length_) return OUT_OF_BOUNDS;
        uint8 = (uint8_t)buffer->data_[index];
        array->Set(Integer::New(i), Integer::NewFromUnsigned(uint8));
        index += 1;
        break;

      default:
        return ThrowException(Exception::Error(
              String::New("Unknown format character")));
    }
  }

  return scope.Close(array);
}

// var nbytes = Buffer.utf8ByteLength("string")
Handle<Value> Buffer::Utf8ByteLength(const Arguments &args) {
  HandleScope scope;
  if (!args[0]->IsString()) {
    return ThrowException(Exception::TypeError(String::New(
            "Argument must be a string")));
  }
  Local<String> s = args[0]->ToString();
  return scope.Close(Integer::New(s->Utf8Length()));
}

Handle<Value> CopyUtility(
  Buffer *source_buffer, char *source,
  uint32_t source_start, uint32_t source_stop,
  Buffer *target_buffer, char *target,
  uint32_t target_start
) {

  if (source_start < 0)
    return ThrowException(String::New("copy/copyFrom 'sourceStart' must "
      "be a positive Number if it is defined."));

  if (source_stop > source_buffer->length())
    return ThrowException(String::New("copy/copyFrom 'sourceStop' must "
      "be less than or equal to the buffer's length"));

  if (target_start < 0)
    return ThrowException(String::New("copy/copyFrom 'targetStart' "
      "must be a positive Number if it is defined."));

  uint32_t length = source_stop - source_start;
  if (target_start + length > target_buffer->length())
    return ThrowException(String::New("copy/copyFrom the source range must "
      "fit within the target."));

  uint32_t target_stop = target_start + length;

  // overlap
  //    v  v  v  v
  //    source---
  //    ---target, or
  //    target---
  //    ---source, but not
  //    v     v     v
  //    source------
  //    ------target, or
  //    target------
  //    ------source
  if (
    ( 
      source + source_start <= target + target_start &&
      target + target_start <  source + source_stop
    ) ||
    (
      target + target_start <= source + source_start &&
      source + source_start <  target + target_stop
    )
  ) {
    // use memmove for overlapping buffers
    memmove(target + target_start, source + source_start, length);
  } else {
    // use memcpy for non-overlapping buffers
    memcpy(target + target_start, source + source_start, length);
  }

}

// target, start, stop, target_start
Handle<Value> Buffer::Copy(const Arguments &args) {
  HandleScope scope;
  Buffer *source_buffer, *target_buffer;
  char *source, *target;
  uint32_t source_start, source_stop, target_start, target_stop;

  if (!Buffer::HasInstance(args.This()))
    return ThrowException(String::New("copy() 'this' must be a Buffer "
      "Object"));
  source_buffer = ObjectWrap::Unwrap<Buffer>(args.This()->ToObject());
  source = source_buffer->data();

  // target
  if (!args[0]->IsObject() || !Buffer::HasInstance(args[0]))
    return ThrowException(String::New("copy() arguments[0] 'target' "
      "must be a Buffer Object"));
  target_buffer = ObjectWrap::Unwrap<Buffer>(args[0]->ToObject());
  target = target_buffer->data();

  // start
  if (args[1]->IsUndefined())
    source_start = 0;
  else if (args[1]->IsInt32())
    source_start = args[1]->Int32Value();
  else
    return ThrowException(String::New("copy() arguments[1] 'start' "
      "must be a Number if it is defined"));

  // stop
  if (args[2]->IsUndefined())
    source_stop = source_buffer->length();
  else if (args[2]->IsInt32())
    source_stop = args[2]->Int32Value();
  else
    return ThrowException(String::New("copy() arguments[2] 'stop' must "
      "be a Number if it is defined"));

  // target_start
  if (args[3]->IsUndefined())
    target_start = 0;
  else if (args[3]->IsInt32())
    target_start = args[3]->Int32Value();
  else
    return ThrowException(String::New("copy() arguments[3] 'targetStart' "
      "must be a Number if it is defined"));

  CopyUtility(
      source_buffer, source, source_start, source_stop,
      target_buffer, target, target_start
  );

  return args.This();
};

// source, start, stop, source_start
Handle<Value> Buffer::CopyFrom(const Arguments &args) {
  HandleScope scope;
  Buffer *source_buffer, *target_buffer;
  char *source, *target;
  uint32_t source_start, source_stop, target_start, target_stop;

  if (!Buffer::HasInstance(args.This()))
    return ThrowException(String::New("copyFrom() 'this' must be a Buffer "
      "Object"));
  target_buffer = ObjectWrap::Unwrap<Buffer>(args.This()->ToObject());
  target = source_buffer->data();

  // source
  if (!args[0]->IsObject() || !Buffer::HasInstance(args[0]))
    return ThrowException(String::New("copyFrom() arguments[1] 'source' "
      "must be a Buffer Object"));
  source_buffer = ObjectWrap::Unwrap<Buffer>(args[0]->ToObject());
  source = source_buffer->data();

  // start
  if (args[1]->IsUndefined())
    target_start = 0;
  else if (args[1]->IsInt32())
    target_start = args[1]->Int32Value();
  else
    return ThrowException(String::New("copyFrom() arguments[1] 'start' "
      "must be a Number if it is defined"));

  // stop
  if (args[2]->IsUndefined())
    target_stop = target_buffer->length();
  else if (args[2]->IsInt32())
    target_stop = args[2]->Int32Value();
  else
    return ThrowException(String::New("copyFrom() arguments[2] 'stop' must "
      "be a Number if it is defined"));

  // target_start
  if (args[3]->IsUndefined())
    target_start = 0;
  else if (args[3]->IsInt32())
    target_start = args[3]->Int32Value();
  else
    return ThrowException(String::New("copyFrom() arguments[3] "
      "'sourceStart' must be a Number if it is defined"));

  CopyUtility(
      source_buffer, source, source_start, source_stop,
      target_buffer, target, target_start
  );

  return args.This();
};

Handle<Value> Buffer::Fill(const Arguments& args) {
  Buffer *target_buffer;
  char *target;
  char fill, target_start, target_stop;

  // target (this)
  if (!Buffer::HasInstance(args.This()))
    return ThrowException(String::New("fill() 'this' must be a Buffer "
      "Object"));
  target_buffer = ObjectWrap::Unwrap<Buffer>(args.This()->ToObject());
  target = target_buffer->data();

  // fill
  if (args[0]->IsUndefined())
    fill = 0;
  else if (args[0]->IsInt32())
    fill = char(args[0]->Int32Value());
  else
    return ThrowException(String::New("fill() arguments[0] 'fill' "
      "must be a Number if it is defined"));

  // start
  if (args[1]->IsUndefined())
    target_start = 0;
  else if (args[1]->IsInt32())
    target_start = args[1]->Int32Value();
  else
    return ThrowException(String::New("fill() arguments[1] 'start' "
      "must be a Number if it is defined"));

  // stop
  if (args[2]->IsUndefined())
    target_stop = target_buffer->length();
  else if (args[2]->IsInt32())
    target_stop = args[2]->Int32Value();
  else
    return ThrowException(String::New("fill() arguments[2] 'stop' must "
      "be a Number if it is defined"));

  if (target_start < 0)
    return ThrowException(String::New("fill() arguments[0] 'start' must "
      "be greater than zero"));

  if (target_stop > target_buffer->length())
    return ThrowException(String::New("fill() arguments[1] 'stop' must "
      " be less than or equal to the length of this buffer"));

  char *begin = target + target_start;
  char *end = target + target_stop;
  for (; begin != end; begin++)
    *begin = fill;

  return args.This();
}

void Buffer::Initialize(Handle<Object> target) {
  HandleScope scope;

  length_symbol = Persistent<String>::New(String::NewSymbol("length"));

  Local<FunctionTemplate> t = FunctionTemplate::New(Buffer::New);
  constructor_template = Persistent<FunctionTemplate>::New(t);
  constructor_template->InstanceTemplate()->SetInternalFieldCount(1);
  constructor_template->SetClassName(String::NewSymbol("Buffer"));

  NODE_SET_PROTOTYPE_METHOD(constructor_template, "copy", Buffer::Copy);
  NODE_SET_PROTOTYPE_METHOD(constructor_template, "copyFrom", Buffer::CopyFrom);

  // copy free
  NODE_SET_PROTOTYPE_METHOD(constructor_template, "asciiRange", Buffer::AsciiRange);
  NODE_SET_PROTOTYPE_METHOD(constructor_template, "range", Buffer::Range);
  // TODO NODE_SET_PROTOTYPE_METHOD(t, "utf16Slice", Utf16Slice);
  // copy
  NODE_SET_PROTOTYPE_METHOD(constructor_template, "utf8Slice", Buffer::Utf8Slice);

  NODE_SET_PROTOTYPE_METHOD(constructor_template, "utf8Write", Buffer::Utf8Write);
  NODE_SET_PROTOTYPE_METHOD(constructor_template, "asciiWrite", Buffer::AsciiWrite);
  NODE_SET_PROTOTYPE_METHOD(constructor_template, "unpack", Buffer::Unpack);

  NODE_SET_METHOD(constructor_template->GetFunction(),
                  "utf8ByteLength",
                  Buffer::Utf8ByteLength);

  target->Set(String::NewSymbol("Buffer"), constructor_template->GetFunction());
}


}  // namespace node
