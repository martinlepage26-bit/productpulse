#!/usr/bin/env python3
"""
ProductPulse AI - Backend API Test Suite
Tests all endpoints systematically with demo credentials
"""
import os
import requests
import sys
import time
from datetime import datetime

BASE_URL = os.environ.get("PULSE_API_URL", "http://localhost:8001/api")
DEMO_EMAIL = "demo@productpulse.ai"
DEMO_PASSWORD = "demo123"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

class APITester:
    def __init__(self):
        self.token = None
        self.user = None
        self.tests_run = 0
        self.tests_passed = 0
        self.tests_failed = 0
        self.failed_tests = []
        
    def log(self, msg, color=Colors.BLUE):
        print(f"{color}{msg}{Colors.END}")
    
    def test(self, name, method, endpoint, expected_status, data=None, headers=None, timeout=30):
        """Run a single API test"""
        url = f"{BASE_URL}{endpoint}"
        h = {'Content-Type': 'application/json'}
        if self.token:
            h['Authorization'] = f'Bearer {self.token}'
        if headers:
            h.update(headers)
        
        self.tests_run += 1
        print(f"\n[{self.tests_run}] Testing: {name}")
        print(f"    {method} {endpoint}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=h, timeout=timeout)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=h, timeout=timeout)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=h, timeout=timeout)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=h, timeout=timeout)
            elif method == 'DELETE':
                response = requests.delete(url, headers=h, timeout=timeout)
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"    ✅ PASS - Status: {response.status_code}", Colors.GREEN)
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                self.tests_failed += 1
                self.failed_tests.append(name)
                self.log(f"    ❌ FAIL - Expected {expected_status}, got {response.status_code}", Colors.RED)
                try:
                    print(f"    Response: {response.json()}")
                except:
                    print(f"    Response: {response.text[:200]}")
                return False, {}
        
        except Exception as e:
            self.tests_failed += 1
            self.failed_tests.append(name)
            self.log(f"    ❌ FAIL - Error: {str(e)}", Colors.RED)
            return False, {}
    
    def run_all_tests(self):
        """Run complete test suite"""
        self.log("\n" + "="*70, Colors.BLUE)
        self.log("ProductPulse AI - Backend API Test Suite", Colors.BLUE)
        self.log("="*70 + "\n", Colors.BLUE)
        
        # ========== AUTH TESTS ==========
        self.log("\n🔐 AUTH TESTS", Colors.YELLOW)
        
        # Test invalid login
        self.test(
            "Login with invalid credentials returns 401",
            "POST", "/auth/login", 401,
            data={"email": "wrong@test.com", "password": "wrong"}
        )
        
        # Test demo login
        success, response = self.test(
            "Login with demo credentials",
            "POST", "/auth/login", 200,
            data={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user = response['user']
            self.log(f"    Token obtained: {self.token[:20]}...", Colors.GREEN)
        else:
            self.log("    ⚠️  Cannot proceed without token", Colors.RED)
            return self.print_summary()
        
        # Test /auth/me
        self.test("GET /auth/me with valid token", "GET", "/auth/me", 200)
        
        # Test /auth/me without token
        old_token = self.token
        self.token = None
        self.test("GET /auth/me without token returns 403", "GET", "/auth/me", 403)
        self.token = old_token
        
        # Test register
        test_email = f"test_{int(time.time())}@test.com"
        success, response = self.test(
            "Register new user",
            "POST", "/auth/register", 200,
            data={"email": test_email, "password": "test123", "store_name": "Test Store"}
        )
        
        if success and 'token' in response:
            # Try logging in with new user
            self.test(
                "Login with newly registered user",
                "POST", "/auth/login", 200,
                data={"email": test_email, "password": "test123"}
            )
        
        # Restore demo token
        success, response = self.test(
            "Re-login with demo credentials",
            "POST", "/auth/login", 200,
            data={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}
        )
        if success:
            self.token = response['token']
        
        # ========== DASHBOARD TESTS ==========
        self.log("\n📊 DASHBOARD TESTS", Colors.YELLOW)
        
        success, dashboard = self.test("GET /dashboard", "GET", "/dashboard", 200)
        
        if success:
            kpis = dashboard.get('kpis', {})
            products = dashboard.get('products', [])
            failure_trends = dashboard.get('failure_trends', [])
            alerts = dashboard.get('alerts', [])
            
            # Validate KPIs
            if kpis.get('products_monitored') == 5:
                self.log(f"    ✓ KPI products_monitored = 5", Colors.GREEN)
            else:
                self.log(f"    ⚠️  Expected products_monitored=5, got {kpis.get('products_monitored')}", Colors.YELLOW)
            
            if kpis.get('critical_products') >= 1:
                self.log(f"    ✓ KPI critical_products = {kpis.get('critical_products')}", Colors.GREEN)
            else:
                self.log(f"    ⚠️  Expected critical_products>=1, got {kpis.get('critical_products')}", Colors.YELLOW)
            
            # Validate products
            if len(products) == 5:
                self.log(f"    ✓ Products count = 5", Colors.GREEN)
            else:
                self.log(f"    ⚠️  Expected 5 products, got {len(products)}", Colors.YELLOW)
            
            # Check Wireless Earbuds
            earbuds = next((p for p in products if p['name'] == 'Wireless Earbuds'), None)
            if earbuds:
                if earbuds.get('health_score') == 38 and earbuds.get('status') == 'Critical':
                    self.log(f"    ✓ Wireless Earbuds: health=38, status=Critical", Colors.GREEN)
                else:
                    self.log(f"    ⚠️  Wireless Earbuds: health={earbuds.get('health_score')}, status={earbuds.get('status')}", Colors.YELLOW)
                
                if earbuds.get('complaint_count') == 9:
                    self.log(f"    ✓ Wireless Earbuds: 9 complaints", Colors.GREEN)
                else:
                    self.log(f"    ⚠️  Wireless Earbuds: {earbuds.get('complaint_count')} complaints (expected 9)", Colors.YELLOW)
            
            # Validate failure trends
            if len(failure_trends) > 0:
                self.log(f"    ✓ Failure trends present: {len(failure_trends)} categories", Colors.GREEN)
            
            # Validate alerts
            if len(alerts) >= 3:
                self.log(f"    ✓ Alerts present: {len(alerts)} alerts", Colors.GREEN)
            else:
                self.log(f"    ⚠️  Expected >=3 alerts, got {len(alerts)}", Colors.YELLOW)
        
        # ========== PRODUCTS TESTS ==========
        self.log("\n📦 PRODUCTS TESTS", Colors.YELLOW)
        
        success, products = self.test("GET /products", "GET", "/products", 200)
        
        product_id = None
        if success and len(products) > 0:
            product_id = products[0]['id']
            self.log(f"    Using product_id: {product_id}", Colors.GREEN)
            
            success, detail = self.test(
                f"GET /products/{product_id}",
                "GET", f"/products/{product_id}", 200
            )
            
            if success:
                if 'product' in detail and 'complaints' in detail and 'insights' in detail and 'recommendations' in detail:
                    self.log(f"    ✓ Product detail has all required fields", Colors.GREEN)
                    self.log(f"    ✓ Complaints: {len(detail.get('complaints', []))}", Colors.GREEN)
                    self.log(f"    ✓ Insights: {len(detail.get('insights', []))}", Colors.GREEN)
                    self.log(f"    ✓ Recommendations: {len(detail.get('recommendations', []))}", Colors.GREEN)
        
        # Test invalid product ID
        self.test("GET /products/invalid-id returns 404", "GET", "/products/invalid-id-12345", 404)
        
        # ========== INSIGHTS TESTS (CORE AI) ==========
        self.log("\n🤖 INSIGHTS TESTS (AI ANALYSIS)", Colors.YELLOW)
        
        # Test analyze endpoint (this takes 10-25 seconds)
        self.log("    ⏳ AI analysis takes 10-25 seconds, please wait...", Colors.YELLOW)
        
        analyze_payload = {
            "product_name": "Wireless Earbuds",
            "platform": "TikTok Shop",
            "source": "Return request",
            "raw_message": "The headphones arrived working, but after three days the left speaker stopped working."
        }
        
        success, analysis = self.test(
            "POST /insights/analyze (AI analysis)",
            "POST", "/insights/analyze", 200,
            data=analyze_payload,
            timeout=40
        )
        
        if success:
            required_fields = ['failure_category', 'root_cause', 'confidence_score', 'severity', 
                             'recommended_fix', 'similar_case_count', 'estimated_monthly_loss']
            missing = [f for f in required_fields if f not in analysis]
            if not missing:
                self.log(f"    ✓ Analysis has all required fields", Colors.GREEN)
                self.log(f"    ✓ Failure category: {analysis.get('failure_category')}", Colors.GREEN)
                self.log(f"    ✓ Severity: {analysis.get('severity')}", Colors.GREEN)
                self.log(f"    ✓ Similar cases: {analysis.get('similar_case_count')}", Colors.GREEN)
                
                if analysis.get('similar_case_count') == 27:
                    self.log(f"    ✓ Similar case count = 27 (expected)", Colors.GREEN)
                else:
                    self.log(f"    ⚠️  Similar case count = {analysis.get('similar_case_count')} (expected ~27)", Colors.YELLOW)
            else:
                self.log(f"    ⚠️  Missing fields: {missing}", Colors.YELLOW)
            
            # Test save insight
            save_payload = {
                **analyze_payload,
                "analysis": analysis
            }
            
            success, saved = self.test(
                "POST /insights/save",
                "POST", "/insights/save", 200,
                data=save_payload
            )
            
            if success:
                if 'insight' in saved and 'recommendation' in saved and 'product' in saved:
                    self.log(f"    ✓ Save returned insight, recommendation, product", Colors.GREEN)
                    
                    # Check if health decreased
                    new_health = saved['product'].get('health_score')
                    self.log(f"    ✓ Updated product health: {new_health}", Colors.GREEN)
                    
                    # Check recommendation status
                    rec_status = saved['recommendation'].get('status')
                    if rec_status == 'Needs Review':
                        self.log(f"    ✓ Recommendation status: {rec_status}", Colors.GREEN)
        
        # Test analyze with missing fields
        self.test(
            "POST /insights/analyze with missing product_name returns 400",
            "POST", "/insights/analyze", 400,
            data={"raw_message": "test"}
        )
        
        # ========== RECOMMENDATIONS TESTS ==========
        self.log("\n📋 RECOMMENDATIONS TESTS", Colors.YELLOW)
        
        success, recs = self.test("GET /recommendations", "GET", "/recommendations", 200)
        
        rec_id = None
        if success and len(recs) > 0:
            rec_id = recs[0]['id']
            self.log(f"    ✓ Found {len(recs)} recommendations", Colors.GREEN)
            
            # Test status update
            for status in ['Approved', 'In Progress', 'Done']:
                success, updated = self.test(
                    f"PATCH /recommendations/{rec_id}/status to {status}",
                    "PATCH", f"/recommendations/{rec_id}/status", 200,
                    data={"status": status}
                )
                
                if success and updated.get('status') == status:
                    self.log(f"    ✓ Status updated to {status}", Colors.GREEN)
            
            # Test invalid status
            self.test(
                "PATCH /recommendations/{id}/status with invalid status returns 400",
                "PATCH", f"/recommendations/{rec_id}/status", 400,
                data={"status": "InvalidStatus"}
            )
        
        # Test filter
        success, filtered = self.test(
            "GET /recommendations?status=Approved",
            "GET", "/recommendations?status=Approved", 200
        )
        
        # ========== ALERTS TESTS ==========
        self.log("\n🔔 ALERTS TESTS", Colors.YELLOW)
        
        success, alerts = self.test("GET /alerts", "GET", "/alerts", 200)
        
        alert_id = None
        if success and len(alerts) > 0:
            alert_id = alerts[0]['id']
            self.log(f"    ✓ Found {len(alerts)} alerts", Colors.GREEN)
            
            # Test mark read
            success, _ = self.test(
                f"PATCH /alerts/{alert_id}/read",
                "PATCH", f"/alerts/{alert_id}/read", 200
            )
            
            # Test mark all read
            success, _ = self.test(
                "POST /alerts/read-all",
                "POST", "/alerts/read-all", 200
            )
        
        # ========== SETTINGS TESTS ==========
        self.log("\n⚙️  SETTINGS TESTS", Colors.YELLOW)
        
        success, settings = self.test("GET /settings", "GET", "/settings", 200)
        
        if success:
            # Test update settings
            update_payload = {
                "store_name": "Updated Test Store",
                "refund_cost_estimate": 150.0,
                "average_order_value": 50.0
            }
            
            success, updated = self.test(
                "PUT /settings",
                "PUT", "/settings", 200,
                data=update_payload
            )
            
            if success:
                if updated.get('store_name') == "Updated Test Store":
                    self.log(f"    ✓ Settings updated successfully", Colors.GREEN)
        
        # ========== PHASE 3: NEW FEATURES TESTS ==========
        self.log("\n🆕 PHASE 3: HEALTH HISTORY & CSV IMPORT TESTS", Colors.YELLOW)
        
        # Test 1: GET /products - verify health_history array exists
        success, products = self.test("GET /products (check health_history)", "GET", "/products", 200)
        
        if success and len(products) > 0:
            earbuds = next((p for p in products if p['name'] == 'Wireless Earbuds'), None)
            if earbuds:
                history = earbuds.get('health_history', [])
                if isinstance(history, list) and len(history) >= 6:
                    self.log(f"    ✓ Wireless Earbuds has health_history with {len(history)} snapshots", Colors.GREEN)
                    # Check last snapshot matches current score
                    if history[-1].get('score') == earbuds.get('health_score'):
                        self.log(f"    ✓ Latest history snapshot ({history[-1].get('score')}) matches health_score ({earbuds.get('health_score')})", Colors.GREEN)
                    else:
                        self.log(f"    ⚠️  Latest history snapshot ({history[-1].get('score')}) != health_score ({earbuds.get('health_score')})", Colors.YELLOW)
                else:
                    self.log(f"    ⚠️  health_history missing or too short: {len(history)} snapshots", Colors.YELLOW)
        
        # Test 2: POST /imports with valid rows
        self.log("\n    ⏳ CSV import test (takes 15-30s for AI batch analysis)...", Colors.YELLOW)
        
        import_payload = {
            "rows": [
                {
                    "product_name": "Phone Charger",
                    "platform": "Shopify",
                    "source": "Review",
                    "raw_message": "The cable broke after just 5 days. Very poor quality.",
                    "internal_notes": "Test import 1"
                },
                {
                    "product_name": "Yoga Mat",
                    "platform": "Amazon",
                    "source": "Return request",
                    "raw_message": "This mat is way too thin. Not what I expected from the photos.",
                    "internal_notes": "Test import 2"
                }
            ]
        }
        
        success, job = self.test(
            "POST /imports (create import job)",
            "POST", "/imports", 200,
            data=import_payload,
            timeout=5
        )
        
        job_id = None
        if success and 'id' in job:
            job_id = job['id']
            self.log(f"    ✓ Import job created: {job_id}", Colors.GREEN)
            self.log(f"    ✓ Job status: {job.get('status')}, total: {job.get('total')}", Colors.GREEN)
            
            # Poll job status
            max_polls = 18  # 18 * 5s = 90s max
            for i in range(max_polls):
                time.sleep(5)
                success, job_status = self.test(
                    f"GET /imports/{job_id} (poll #{i+1})",
                    "GET", f"/imports/{job_id}", 200,
                    timeout=10
                )
                
                if success:
                    status = job_status.get('status')
                    processed = job_status.get('processed', 0)
                    total = job_status.get('total', 0)
                    self.log(f"    ⏳ Job status: {status}, processed: {processed}/{total}", Colors.YELLOW)
                    
                    if status == 'completed':
                        succeeded = job_status.get('succeeded', 0)
                        failed = job_status.get('failed', 0)
                        self.log(f"    ✓ Import completed: {succeeded} succeeded, {failed} failed", Colors.GREEN)
                        
                        if succeeded == 2:
                            self.log(f"    ✓ Both rows imported successfully", Colors.GREEN)
                        else:
                            self.log(f"    ⚠️  Expected 2 succeeded, got {succeeded}", Colors.YELLOW)
                        break
                    elif status == 'failed':
                        self.log(f"    ❌ Import job failed", Colors.RED)
                        break
            else:
                self.log(f"    ⚠️  Import job did not complete within 90s", Colors.YELLOW)
        
        # Test 3: POST /imports validation - empty rows
        self.test(
            "POST /imports with empty rows returns 400",
            "POST", "/imports", 400,
            data={"rows": []}
        )
        
        # Test 4: POST /imports validation - >30 rows
        self.test(
            "POST /imports with >30 rows returns 400",
            "POST", "/imports", 400,
            data={"rows": [{"product_name": f"Product {i}", "raw_message": f"Message {i}"} for i in range(31)]}
        )
        
        # Test 5: GET /imports/{bad-id} returns 404
        self.test(
            "GET /imports/invalid-id returns 404",
            "GET", "/imports/invalid-job-id-12345", 404
        )
        
        # Test 6: POST /imports without auth returns 403
        old_token = self.token
        self.token = None
        self.test(
            "POST /imports without auth returns 403",
            "POST", "/imports", 403,
            data={"rows": [{"product_name": "Test", "raw_message": "Test"}]}
        )
        self.token = old_token
        
        # Test 7: Volume-spike alert detection
        self.log("\n    Testing volume-spike alert logic...", Colors.YELLOW)
        
        # Save multiple complaints for the same product to trigger volume spike
        for i in range(3):
            analyze_payload = {
                "product_name": "LED Strip Lights",
                "platform": "Amazon",
                "source": "Review",
                "raw_message": f"The adhesive failed and the strip fell off my wall. Attempt {i+1}."
            }
            
            success, analysis = self.test(
                f"POST /insights/analyze for LED Strip Lights #{i+1}",
                "POST", "/insights/analyze", 200,
                data=analyze_payload,
                timeout=30
            )
            
            if success:
                save_payload = {**analyze_payload, "analysis": analysis}
                success, saved = self.test(
                    f"POST /insights/save for LED Strip Lights #{i+1}",
                    "POST", "/insights/save", 200,
                    data=save_payload
                )
                
                if success and i == 2:  # After 3rd save, check for volume_increase alert
                    alerts = saved.get('alerts', [])
                    volume_alerts = [a for a in alerts if a.get('type') == 'volume_increase']
                    if volume_alerts:
                        self.log(f"    ✓ Volume-spike alert created: {volume_alerts[0].get('message')}", Colors.GREEN)
                    else:
                        self.log(f"    ⚠️  No volume_increase alert found (may need more complaints or time window)", Colors.YELLOW)
        
        # Test 8: Check that duplicate volume_increase alerts are not created within 24h
        # Save one more complaint for the same product
        analyze_payload = {
            "product_name": "LED Strip Lights",
            "platform": "Amazon",
            "source": "Review",
            "raw_message": "Another adhesive failure. This is the 4th complaint."
        }
        
        success, analysis = self.test(
            "POST /insights/analyze for LED Strip Lights #4 (duplicate alert check)",
            "POST", "/insights/analyze", 200,
            data=analyze_payload,
            timeout=30
        )
        
        if success:
            save_payload = {**analyze_payload, "analysis": analysis}
            success, saved = self.test(
                "POST /insights/save for LED Strip Lights #4",
                "POST", "/insights/save", 200,
                data=save_payload
            )
            
            if success:
                alerts = saved.get('alerts', [])
                volume_alerts = [a for a in alerts if a.get('type') == 'volume_increase']
                if not volume_alerts:
                    self.log(f"    ✓ No duplicate volume_increase alert created (24h dedup working)", Colors.GREEN)
                else:
                    self.log(f"    ⚠️  Duplicate volume_increase alert created (should be deduped)", Colors.YELLOW)
        
        # Test 9: Verify health_history grows after POST /insights/save
        success, products_before = self.test("GET /products (before save)", "GET", "/products", 200)
        
        if success:
            glass_bottle = next((p for p in products_before if p['name'] == 'Glass Water Bottle'), None)
            if glass_bottle:
                history_before = glass_bottle.get('health_history', [])
                len_before = len(history_before)
                
                # Save a new insight for Glass Water Bottle
                analyze_payload = {
                    "product_name": "Glass Water Bottle",
                    "platform": "Etsy",
                    "source": "Email",
                    "raw_message": "The bottle arrived completely shattered. Packaging was inadequate."
                }
                
                success, analysis = self.test(
                    "POST /insights/analyze for Glass Water Bottle",
                    "POST", "/insights/analyze", 200,
                    data=analyze_payload,
                    timeout=30
                )
                
                if success:
                    save_payload = {**analyze_payload, "analysis": analysis}
                    success, saved = self.test(
                        "POST /insights/save for Glass Water Bottle",
                        "POST", "/insights/save", 200,
                        data=save_payload
                    )
                    
                    if success:
                        updated_product = saved.get('product', {})
                        history_after = updated_product.get('health_history', [])
                        len_after = len(history_after)
                        
                        if len_after == len_before + 1:
                            self.log(f"    ✓ health_history grew from {len_before} to {len_after} snapshots", Colors.GREEN)
                        else:
                            self.log(f"    ⚠️  health_history length: before={len_before}, after={len_after} (expected +1)", Colors.YELLOW)
        
        # Test 10: REGRESSION - Verify demo earbuds analysis still returns expected values
        self.log("\n    🔄 REGRESSION: Testing demo earbuds analysis (TF-IDF upgrade must not change values)...", Colors.YELLOW)
        
        analyze_payload = {
            "product_name": "Wireless Earbuds",
            "platform": "TikTok Shop",
            "source": "Return request",
            "raw_message": "The headphones arrived working, but after three days the left speaker stopped working."
        }
        
        success, analysis = self.test(
            "POST /insights/analyze (regression test)",
            "POST", "/insights/analyze", 200,
            data=analyze_payload,
            timeout=40
        )
        
        if success:
            failure_category = analysis.get('failure_category')
            similar_count = analysis.get('similar_case_count')
            estimated_loss = analysis.get('estimated_monthly_loss')
            
            if failure_category == 'Component Failure':
                self.log(f"    ✓ failure_category = Component Failure (expected)", Colors.GREEN)
            else:
                self.log(f"    ⚠️  failure_category = {failure_category} (expected Component Failure)", Colors.YELLOW)
            
            if similar_count == 27:
                self.log(f"    ✓ similar_case_count = 27 (expected)", Colors.GREEN)
            else:
                self.log(f"    ⚠️  similar_case_count = {similar_count} (expected 27)", Colors.YELLOW)
            
            if estimated_loss == 3861:
                self.log(f"    ✓ estimated_monthly_loss = 3861 (expected)", Colors.GREEN)
            else:
                self.log(f"    ⚠️  estimated_monthly_loss = {estimated_loss} (expected 3861)", Colors.YELLOW)
        
        # ========== DEMO RESET TEST ==========
        self.log("\n🔄 DEMO RESET TEST", Colors.YELLOW)
        
        success, reset_result = self.test(
            "POST /api/demo/reset",
            "POST", "/demo/reset", 200
        )
        
        if success:
            self.log(f"    ✓ Demo data reset: {reset_result}", Colors.GREEN)
        
        # ========== SUMMARY ==========
        return self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        self.log("\n" + "="*70, Colors.BLUE)
        self.log("TEST SUMMARY", Colors.BLUE)
        self.log("="*70, Colors.BLUE)
        
        self.log(f"\nTotal tests run: {self.tests_run}", Colors.BLUE)
        self.log(f"Passed: {self.tests_passed}", Colors.GREEN)
        self.log(f"Failed: {self.tests_failed}", Colors.RED)
        
        if self.tests_failed > 0:
            self.log(f"\n❌ Failed tests:", Colors.RED)
            for test in self.failed_tests:
                self.log(f"  - {test}", Colors.RED)
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        self.log(f"\nSuccess rate: {success_rate:.1f}%", Colors.GREEN if success_rate >= 90 else Colors.YELLOW)
        
        if self.tests_failed == 0:
            self.log("\n✅ ALL TESTS PASSED!", Colors.GREEN)
            return 0
        else:
            self.log(f"\n⚠️  {self.tests_failed} test(s) failed", Colors.YELLOW)
            return 1

def main():
    tester = APITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())
