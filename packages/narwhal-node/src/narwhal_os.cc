
#include <narwhal_os.h>
#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <errno.h>

extern char **environ;

using namespace narwhal;
using namespace v8;

static Handle<Value> Exit(const Arguments& args) {
  HandleScope scope;
  exit(args[0]->Int32Value());
}

static Handle<Value> Fork(const Arguments& args) {
  HandleScope scope;
  return Number::New(fork());
}

static char **Environ(Local<Object> object) {
  HandleScope scope;
  char **env;
  Local<Array> names = object->GetPropertyNames();
  int length = names->Length();
  env = new char*[length + 1];
  env[length] = 0;
  for (int i = 0; i < length; i++) {
    Local<String> name = names->Get(i)->ToString();
    int name_length = name->Length();
    Local<String> value = object->Get(name)->ToString();
    int value_length = value->Length();
    env[i] = new char[name_length + 1 + value_length + 1];
    name->WriteAscii(env[i], 0, name_length);
    env[i][name_length] = '=';
    value->WriteAscii(env[i] + name_length + 1, 0, value_length);
    env[i][name_length + 1 + value_length] = 0;
  }
  return env;
}


static char **ArrayOfStrings(Local<Array> array) {
  HandleScope scope;
  int length = array->Length();
  char **args = new char*[length + 1];
  for (int i = 0; i < length; i++) {
    Handle<String> value = array->Get(i)->ToString();
    int value_length = value->Length();
    args[i] = new char[value_length + 1];
    value->WriteAscii(args[i], 0, value_length);
    args[i][value_length] = 0;
  }
  args[length] = 0;
  return args;
}

static void DeleteArrayOfStrings(char *array[]) {
  for (char *at = array[0]; at; at++) {
    printf("deleting %s", at);
    delete at;
  }
  delete array;
}

static Handle<Value> System(const Arguments& args) {
  HandleScope scope;
  return Number::New(1);

  /*
  if (!args[0]->IsString())
    return ThrowException(String::New("system(0) must be a string"));

  Local<String> command_string = args[0]->ToString();
  int command_length = command_string->Length();
  printf("%d", command_length);
  char *command = new char[command_length + 1];
  command_string->WriteAscii(command, 0, command_length);
  command[command_length] = 0;

  int status = system(command);
  delete command;
  if (status)
    return ThrowException(String::New("system() exited with a non-zero value"));
  // TODO, meaningful error
  */
}

// path, args, env, PATH String or search
static Handle<Value> Exec(const Arguments& args) {
  HandleScope scope;
  Local<Value> result;

  char **argv;
  char **old_environ = environ;

  if (!args[0]->IsString()) {
    return ThrowException(String::New("exec(0) must be String"));
  }

  if (args[1]->IsArray()) {
    argv = ArrayOfStrings(Local<Array>::Cast(args[1]));
  } else {
    argv = new char*[1];
    argv[0] = 0;
  }

  if (args[2]->IsObject()) {
    environ = Environ(Local<Object>::Cast(args[2]));
  }

  Local<String> path_string = args[0]->ToString();
  int path_string_length = path_string->Length();
  char *path = new char[path_string_length + 1];
  path_string->WriteAscii(path, 0, path_string_length);
  path[path_string_length] = 0;

  int code = 0;

  if (args[3]->IsBoolean()) {
    if (args[3]->BooleanValue()) {
      code = execvp(path, argv);
    } else {
      code = execv(path, argv);
    }
  } else if (args[3]->IsString()) {
    Local<String> search_path_string = args[3]->ToString();
    int search_path_string_length = search_path_string->Length();
    char *search_path = new char[search_path_string_length + 1];
    search_path[search_path_string_length] = 0;
    code = execvP(path, search_path, argv);
    delete search_path;
  } else if (args[3]->IsUndefined()) {
    code = execv(path, argv);
  } else {
    return ThrowException(String::New("exec(3) must be String/Boolean/Undefined"));
  }

  if (code != 0)
    return ThrowException(String::New(strerror(errno)));

  DeleteArrayOfStrings(argv);
  DeleteArrayOfStrings(environ);
  environ = old_environ;
  return Undefined();
}

static Handle<Value> Dup(const Arguments& args) {
  HandleScope scope;
  return Number::New(dup(args[0]->Int32Value()));
}

static Handle<Value> Dup2(const Arguments& args) {
  HandleScope scope;
  dup2(args[0]->Int32Value(), args[1]->Int32Value());
  return Undefined();
}

static Handle<Value> Pipe(const Arguments& args) {
  HandleScope scope;
  Local<Array> descriptors;
  int fds[2];
  pipe(fds);
  descriptors = Array::New(2);
  descriptors->Set(0, Number::New(fds[0]));
  descriptors->Set(1, Number::New(fds[1]));
  descriptors->Set(String::NewSymbol("reader"), Number::New(fds[0]));
  descriptors->Set(String::NewSymbol("writer"), Number::New(fds[1]));
  return scope.Close(descriptors);
};

void Os::Initialize(Handle<Object> target) {
  NODE_SET_METHOD(target, "system", System);
  NODE_SET_METHOD(target, "exit", Exit);
  NODE_SET_METHOD(target, "fork", Fork);
  NODE_SET_METHOD(target, "exec0", Exec);
  NODE_SET_METHOD(target, "dup", Dup);
  NODE_SET_METHOD(target, "dup2", Dup2);
  NODE_SET_METHOD(target, "pipe", Pipe);
}

