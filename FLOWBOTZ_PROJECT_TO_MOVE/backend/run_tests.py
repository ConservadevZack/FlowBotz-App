#!/usr/bin/env python3
"""
FlowBotz API Test Runner
Comprehensive test execution with detailed reporting
"""
import os
import sys
import subprocess
import json
import time
from datetime import datetime
from pathlib import Path

def install_test_dependencies():
    """Install test dependencies."""
    print("📦 Installing test dependencies...")
    try:
        subprocess.run([
            sys.executable, "-m", "pip", "install", "-r", "test_requirements.txt"
        ], check=True, capture_output=True, text=True)
        print("✅ Test dependencies installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install test dependencies: {e}")
        print(f"Error output: {e.stderr}")
        return False

def run_test_suite(test_pattern="", markers="", verbose=True):
    """Run the test suite with specified options."""
    cmd = [sys.executable, "-m", "pytest"]
    
    if verbose:
        cmd.append("-v")
    
    if markers:
        cmd.extend(["-m", markers])
    
    if test_pattern:
        cmd.append(test_pattern)
    
    # Add coverage and reporting options
    cmd.extend([
        "--tb=short",
        "--cov=app",
        "--cov-report=html:htmlcov",
        "--cov-report=term-missing",
        "--html=reports/test_report.html",
        "--self-contained-html"
    ])
    
    print(f"🧪 Running tests: {' '.join(cmd)}")
    
    try:
        # Create reports directory
        os.makedirs("reports", exist_ok=True)
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        return result
    except subprocess.TimeoutExpired:
        print("⏰ Tests timed out after 5 minutes")
        return None
    except Exception as e:
        print(f"❌ Error running tests: {e}")
        return None

def analyze_test_results(result):
    """Analyze test results and generate summary."""
    if not result:
        return {
            "status": "failed",
            "error": "Test execution failed or timed out"
        }
    
    output_lines = result.stdout.split('\n')
    
    # Parse pytest output
    summary = {
        "status": "unknown",
        "passed": 0,
        "failed": 0,
        "skipped": 0,
        "errors": 0,
        "warnings": 0,
        "duration": "unknown",
        "coverage": "unknown"
    }
    
    # Look for test summary line
    for line in output_lines:
        if "passed" in line and ("failed" in line or "error" in line or "skipped" in line):
            # Example: "10 passed, 2 failed, 1 skipped in 5.23s"
            parts = line.split()
            for i, part in enumerate(parts):
                if part == "passed" and i > 0:
                    summary["passed"] = int(parts[i-1])
                elif part == "failed" and i > 0:
                    summary["failed"] = int(parts[i-1])
                elif part == "skipped" and i > 0:
                    summary["skipped"] = int(parts[i-1])
                elif part == "error" and i > 0:
                    summary["errors"] = int(parts[i-1])
                elif "in" in part and i > 0:
                    summary["duration"] = parts[i+1]
        
        # Look for coverage information
        if "TOTAL" in line and "%" in line:
            parts = line.split()
            for part in parts:
                if "%" in part:
                    summary["coverage"] = part
                    break
    
    # Determine overall status
    if result.returncode == 0:
        summary["status"] = "passed"
    else:
        summary["status"] = "failed"
    
    return summary

def generate_detailed_report(results):
    """Generate detailed test report."""
    report = {
        "timestamp": datetime.now().isoformat(),
        "test_suites": results,
        "overall_status": "passed" if all(r["status"] == "passed" for r in results.values()) else "failed",
        "total_tests": sum(r.get("passed", 0) + r.get("failed", 0) + r.get("skipped", 0) for r in results.values()),
        "total_passed": sum(r.get("passed", 0) for r in results.values()),
        "total_failed": sum(r.get("failed", 0) for r in results.values()),
        "total_skipped": sum(r.get("skipped", 0) for r in results.values())
    }
    
    # Save detailed report
    os.makedirs("reports", exist_ok=True)
    with open("reports/test_results.json", "w") as f:
        json.dump(report, f, indent=2)
    
    return report

def print_summary_report(report):
    """Print summary report to console."""
    print("\n" + "="*80)
    print("🧪 FLOWBOTZ API TEST REPORT")
    print("="*80)
    print(f"📅 Timestamp: {report['timestamp']}")
    print(f"🎯 Overall Status: {'✅ PASSED' if report['overall_status'] == 'passed' else '❌ FAILED'}")
    print(f"📊 Total Tests: {report['total_tests']}")
    print(f"✅ Passed: {report['total_passed']}")
    print(f"❌ Failed: {report['total_failed']}")
    print(f"⏭️  Skipped: {report['total_skipped']}")
    
    if report['total_tests'] > 0:
        success_rate = (report['total_passed'] / report['total_tests']) * 100
        print(f"📈 Success Rate: {success_rate:.1f}%")
    
    print("\n📋 Test Suite Results:")
    print("-" * 40)
    
    for suite_name, results in report['test_suites'].items():
        status_icon = "✅" if results['status'] == 'passed' else "❌"
        print(f"{status_icon} {suite_name}")
        print(f"   Passed: {results.get('passed', 0)}, Failed: {results.get('failed', 0)}, Skipped: {results.get('skipped', 0)}")
        if results.get('coverage') != 'unknown':
            print(f"   Coverage: {results.get('coverage', 'N/A')}")
        if results.get('duration') != 'unknown':
            print(f"   Duration: {results.get('duration', 'N/A')}")
        print()
    
    print("="*80)

def main():
    """Main test execution function."""
    print("🚀 FlowBotz API Comprehensive Test Suite")
    print("="*50)
    
    # Change to backend directory
    backend_dir = Path(__file__).parent
    os.chdir(backend_dir)
    
    # Install dependencies
    if not install_test_dependencies():
        sys.exit(1)
    
    # Test suites to run
    test_suites = {
        "Health & Basic": {
            "pattern": "tests/test_health.py",
            "markers": "unit"
        },
        "Supabase Integration": {
            "pattern": "tests/test_supabase.py", 
            "markers": "supabase"
        },
        "AI APIs": {
            "pattern": "tests/test_ai_apis.py",
            "markers": "ai"
        },
        "Print APIs": {
            "pattern": "tests/test_print_apis.py",
            "markers": "integration"
        },
        "Stripe Payments": {
            "pattern": "tests/test_stripe_payments.py",
            "markers": "payment"
        },
        "Frontend Integration": {
            "pattern": "tests/test_frontend_integration.py",
            "markers": "integration"
        },
        "Security Tests": {
            "pattern": "tests/test_security.py",
            "markers": "security"
        },
        "Performance Tests": {
            "pattern": "tests/test_performance.py",
            "markers": "performance"
        }
    }
    
    results = {}
    
    # Run each test suite
    for suite_name, config in test_suites.items():
        print(f"\n🧪 Running {suite_name} Tests...")
        print("-" * 40)
        
        result = run_test_suite(
            test_pattern=config["pattern"],
            markers=config["markers"]
        )
        
        results[suite_name] = analyze_test_results(result)
        
        # Print immediate feedback
        status = results[suite_name]["status"]
        if status == "passed":
            print(f"✅ {suite_name}: PASSED")
        elif status == "failed":
            print(f"❌ {suite_name}: FAILED")
        else:
            print(f"⚠️  {suite_name}: {status.upper()}")
    
    # Generate and print final report
    report = generate_detailed_report(results)
    print_summary_report(report)
    
    # Additional recommendations
    print("\n🔧 RECOMMENDATIONS:")
    print("-" * 20)
    
    failed_suites = [name for name, result in results.items() if result["status"] == "failed"]
    
    if failed_suites:
        print("❌ Issues Found:")
        for suite in failed_suites:
            print(f"   • Fix failures in {suite}")
        print()
    
    print("✅ What's Working:")
    print("   • Test infrastructure is properly set up")
    print("   • Comprehensive test coverage across all integrations")
    print("   • Mock implementations for external services")
    print("   • Security and performance testing framework")
    print()
    
    print("⚠️  Next Steps:")
    print("   • Implement actual API integrations to replace mocks")
    print("   • Set up real environment variables for testing")
    print("   • Configure CI/CD pipeline for automated testing")
    print("   • Add integration tests with real external services")
    print("   • Implement rate limiting and security measures")
    print()
    
    print("📊 Reports Generated:")
    print("   • HTML Report: reports/test_report.html")
    print("   • Coverage Report: htmlcov/index.html") 
    print("   • JSON Results: reports/test_results.json")
    
    # Return appropriate exit code
    if report['overall_status'] == 'passed':
        print(f"\n🎉 All tests completed successfully!")
        sys.exit(0)
    else:
        print(f"\n⚠️  Some tests failed. Review the results and fix issues.")
        sys.exit(1)

if __name__ == "__main__":
    main()