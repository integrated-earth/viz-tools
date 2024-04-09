
help:
	@echo "commands:"
	@echo "indent    - indents the c++ code"

indent:
	clang-format-16 -i sample/sample.cc sample/structured.h convert-pd2/convert-pd2.cc

.PHONY: help indent
