import requests
import sys
import json
import time
from datetime import datetime
import tempfile
import os

class SecureFileShareTester:
    def __init__(self, base_url="https://verify-fileshare.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_result(self, test_name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {test_name}")
        if details:
            print(f"    Details: {details}")

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)
        
        if files:
            # Remove Content-Type for file uploads
            test_headers.pop('Content-Type', None)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files, data=data, headers=test_headers)
                else:
                    response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if success and response.content:
                try:
                    response_data = response.json()
                    details += f", Response: {json.dumps(response_data, indent=2)[:200]}..."
                    self.log_result(name, success, details)
                    return success, response_data
                except:
                    # Handle non-JSON responses (like file downloads)
                    details += f", Content-Length: {len(response.content)}"
                    self.log_result(name, success, details)
                    return success, response.content
            else:
                if not success:
                    try:
                        error_data = response.json()
                        details += f", Error: {error_data}"
                    except:
                        details += f", Error: {response.text[:100]}"
                
                self.log_result(name, success, details)
                return success, {}

        except Exception as e:
            self.log_result(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, response = self.run_test("Root API", "GET", "", 200)
        return success

    def test_user_registration(self):
        """Test user registration"""
        timestamp = int(time.time())
        self.user_data = {
            "name": f"Test User {timestamp}",
            "email": f"test{timestamp}@example.com",
            "phone": "+1234567890",
            "password": "TestPass123!"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=self.user_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            return True
        return False

    def test_user_login(self):
        """Test user login"""
        login_data = {
            "email": self.user_data["email"],
            "password": self.user_data["password"]
        }
        
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            return True
        return False

    def test_get_user_profile(self):
        """Test get current user profile"""
        success, response = self.run_test(
            "Get User Profile",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_file_upload(self):
        """Test file upload with real and decoy files"""
        # Create temporary test files
        real_content = b"This is the REAL secret document content!"
        decoy_content = b"This is a DECOY file - fake content for intruders."
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.txt') as real_file:
            real_file.write(real_content)
            real_file_path = real_file.name
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.txt') as decoy_file:
            decoy_file.write(decoy_content)
            decoy_file_path = decoy_file.name
        
        try:
            files = {
                'real_file': ('secret.txt', open(real_file_path, 'rb'), 'text/plain'),
                'decoy_file': ('fake.txt', open(decoy_file_path, 'rb'), 'text/plain')
            }
            
            success, response = self.run_test(
                "File Upload",
                "POST",
                "files/upload",
                200,
                files=files
            )
            
            # Close files
            files['real_file'][1].close()
            files['decoy_file'][1].close()
            
            if success and 'file_id' in response:
                self.uploaded_file_id = response['file_id']
                return True
            return False
            
        finally:
            # Clean up temp files
            os.unlink(real_file_path)
            os.unlink(decoy_file_path)

    def test_get_user_files(self):
        """Test getting user's uploaded files"""
        success, response = self.run_test(
            "Get User Files",
            "GET",
            "files",
            200
        )
        return success

    def test_create_share_link(self):
        """Test creating a share link"""
        if not hasattr(self, 'uploaded_file_id'):
            self.log_result("Create Share Link", False, "No uploaded file to share")
            return False
        
        share_data = {
            "file_id": self.uploaded_file_id,
            "password": "correct_password_123",
            "expiry_hours": 24,
            "download_limit": 5
        }
        
        success, response = self.run_test(
            "Create Share Link",
            "POST",
            "share/create",
            200,
            data=share_data
        )
        
        if success and 'link_token' in response:
            self.share_token = response['link_token']
            self.correct_password = share_data['password']
            return True
        return False

    def test_get_share_links(self):
        """Test getting user's share links"""
        success, response = self.run_test(
            "Get Share Links",
            "GET",
            "share/links",
            200
        )
        return success

    def test_access_file_correct_password(self):
        """Test accessing file with CORRECT password (should serve real file)"""
        if not hasattr(self, 'share_token'):
            self.log_result("Access File (Correct Password)", False, "No share token available")
            return False
        
        access_data = {
            "link_token": self.share_token,
            "password": self.correct_password
        }
        
        # This should return file content, not JSON
        url = f"{self.api_url}/access/file"
        headers = {'Content-Type': 'application/json'}
        
        try:
            response = requests.post(url, json=access_data, headers=headers)
            success = response.status_code == 200
            
            if success:
                # Check if we got file content
                content_length = len(response.content)
                details = f"Status: 200, File downloaded, Size: {content_length} bytes"
                self.log_result("Access File (Correct Password)", True, details)
                return True
            else:
                details = f"Status: {response.status_code}, Error: {response.text[:100]}"
                self.log_result("Access File (Correct Password)", False, details)
                return False
                
        except Exception as e:
            self.log_result("Access File (Correct Password)", False, f"Exception: {str(e)}")
            return False

    def test_access_file_wrong_password(self):
        """Test accessing file with WRONG password (should serve decoy file + send alerts)"""
        if not hasattr(self, 'share_token'):
            self.log_result("Access File (Wrong Password)", False, "No share token available")
            return False
        
        access_data = {
            "link_token": self.share_token,
            "password": "wrong_password_123"
        }
        
        # This should return decoy file content and trigger alerts
        url = f"{self.api_url}/access/file"
        headers = {'Content-Type': 'application/json'}
        
        try:
            response = requests.post(url, json=access_data, headers=headers)
            success = response.status_code == 200
            
            if success:
                # Check if we got file content (decoy)
                content_length = len(response.content)
                details = f"Status: 200, Decoy file served, Size: {content_length} bytes, Alerts should be sent"
                self.log_result("Access File (Wrong Password)", True, details)
                return True
            else:
                details = f"Status: {response.status_code}, Error: {response.text[:100]}"
                self.log_result("Access File (Wrong Password)", False, details)
                return False
                
        except Exception as e:
            self.log_result("Access File (Wrong Password)", False, f"Exception: {str(e)}")
            return False

    def test_get_access_attempts(self):
        """Test getting access attempt logs"""
        success, response = self.run_test(
            "Get Access Attempts",
            "GET",
            "access/attempts",
            200
        )
        
        if success and 'attempts' in response:
            attempts = response['attempts']
            details = f"Found {len(attempts)} access attempts"
            
            # Check if we have both correct and incorrect attempts
            correct_attempts = [a for a in attempts if a.get('password_correct')]
            incorrect_attempts = [a for a in attempts if not a.get('password_correct')]
            
            details += f", Correct: {len(correct_attempts)}, Incorrect: {len(incorrect_attempts)}"
            self.log_result("Get Access Attempts", True, details)
            
            # Store attempt ID for blocking test
            if incorrect_attempts:
                self.intrusion_attempt_id = incorrect_attempts[0]['id']
            
            return True
        return False

    def test_block_share_link(self):
        """Test blocking a share link after intrusion"""
        if not hasattr(self, 'intrusion_attempt_id'):
            self.log_result("Block Share Link", False, "No intrusion attempt ID available")
            return False
        
        action_data = {
            "attempt_id": self.intrusion_attempt_id,
            "action": "block"
        }
        
        success, response = self.run_test(
            "Block Share Link",
            "POST",
            "owner/action",
            200,
            data=action_data
        )
        return success

    def test_access_blocked_link(self):
        """Test accessing a blocked link (should fail)"""
        if not hasattr(self, 'share_token'):
            self.log_result("Access Blocked Link", False, "No share token available")
            return False
        
        access_data = {
            "link_token": self.share_token,
            "password": self.correct_password
        }
        
        # This should fail with 403 since link is blocked
        url = f"{self.api_url}/access/file"
        headers = {'Content-Type': 'application/json'}
        
        try:
            response = requests.post(url, json=access_data, headers=headers)
            success = response.status_code == 403
            
            if success:
                details = f"Status: 403, Link correctly blocked"
                self.log_result("Access Blocked Link", True, details)
                return True
            else:
                details = f"Status: {response.status_code}, Expected 403 but got different status"
                self.log_result("Access Blocked Link", False, details)
                return False
                
        except Exception as e:
            self.log_result("Access Blocked Link", False, f"Exception: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all backend tests"""
        print("🔍 Starting Secure File Share Backend Tests...")
        print(f"🌐 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Test sequence
        tests = [
            self.test_root_endpoint,
            self.test_user_registration,
            self.test_user_login,
            self.test_get_user_profile,
            self.test_file_upload,
            self.test_get_user_files,
            self.test_create_share_link,
            self.test_get_share_links,
            self.test_access_file_correct_password,
            self.test_access_file_wrong_password,
            self.test_get_access_attempts,
            self.test_block_share_link,
            self.test_access_blocked_link
        ]
        
        for test in tests:
            try:
                test()
                time.sleep(0.5)  # Small delay between tests
            except Exception as e:
                self.log_result(test.__name__, False, f"Test exception: {str(e)}")
        
        # Print summary
        print("=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        print(f"✅ Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        # Print failed tests
        failed_tests = [r for r in self.test_results if not r['success']]
        if failed_tests:
            print("\n❌ Failed Tests:")
            for test in failed_tests:
                print(f"  - {test['test']}: {test['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = SecureFileShareTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())