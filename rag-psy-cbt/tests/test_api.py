import unittest
from unittest.mock import patch, Mock
import requests
import sys
import os

# Ensure src can be imported
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../src')))

from api import call_llm

class TestCallLLM(unittest.TestCase):
    @patch('api.http_requests.post')
    def test_call_llm_success(self, mock_post):
        # Setup mock response
        mock_resp = Mock()
        mock_resp.json.return_value = {
            "choices": [
                {
                    "message": {
                        "content": "Hello, world!"
                    }
                }
            ]
        }
        mock_resp.raise_for_status.return_value = None
        mock_post.return_value = mock_resp

        # Call function
        result = call_llm("system prompt", "user message")

        # Assertions
        self.assertEqual(result, "Hello, world!")
        mock_post.assert_called_once()
        args, kwargs = mock_post.call_args
        self.assertEqual(args[0], "https://api.siliconflow.cn/v1/chat/completions")
        self.assertEqual(kwargs["json"]["messages"][0]["content"], "system prompt")
        self.assertEqual(kwargs["json"]["messages"][1]["content"], "user message")

    @patch('api.http_requests.post')
    def test_call_llm_http_error(self, mock_post):
        # Setup mock response for HTTP error
        mock_resp = Mock()
        mock_resp.raise_for_status.side_effect = requests.exceptions.HTTPError("400 Client Error")
        mock_post.return_value = mock_resp

        # Call function and check for exception
        with self.assertRaises(requests.exceptions.HTTPError):
            call_llm("system prompt", "user message")

    @patch('api.http_requests.post')
    def test_call_llm_invalid_response_format(self, mock_post):
        # Setup mock response for invalid format
        mock_resp = Mock()
        mock_resp.json.return_value = {}  # Missing 'choices'
        mock_resp.raise_for_status.return_value = None
        mock_post.return_value = mock_resp

        with self.assertRaises(KeyError):
            call_llm("system prompt", "user message")

if __name__ == '__main__':
    unittest.main()
