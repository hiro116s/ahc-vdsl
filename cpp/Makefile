.PHONY: test test-enabled test-disabled clean

CXX = g++
CXXFLAGS = -std=c++17 -O2 -Wall -Wextra

test: test-enabled test-disabled

test-enabled:
	@echo "=== Testing with ENABLE_VIS ==="
	$(CXX) $(CXXFLAGS) -o ahc_vdsl_test ahc_vdsl_test.cpp
	./ahc_vdsl_test
	@echo ""

test-disabled:
	@echo "=== Testing without ENABLE_VIS (zero-cost) ==="
	$(CXX) $(CXXFLAGS) -o ahc_vdsl_test_disabled ahc_vdsl_test_disabled.cpp
	./ahc_vdsl_test_disabled
	@echo ""

clean:
	rm -f ahc_vdsl_test ahc_vdsl_test_disabled
	rm -f /tmp/vis_test_*.txt
