from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from farm.models import Farmer, InventoryItem, Alert
from farm.utils import estimate_resources, suggest_tools, answer_farm_query


class DashboardTests(TestCase):
    def test_dashboard_creates_demo_farmer_and_renders(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Ramesh Kumar")
        self.assertContains(response, "Wheat")
        self.assertTrue(Farmer.objects.filter(name="Ramesh Kumar").exists())


class InventoryTests(TestCase):
    def test_add_item_and_list(self):
        response = self.client.post(
            "/inventory/add/",
            {
                "name": "Urea",
                "category": "fertilizer",
                "quantity": "2",
                "unit": "kg",
                "low_stock_threshold": "5",
                "expiry_date": "2026-09-22",
            },
            follow=True,
        )
        self.assertEqual(response.status_code, 200)
        item = InventoryItem.objects.get(name="Urea")
        self.assertEqual(item.quantity, 2)
        self.assertTrue(item.is_low_stock)
        self.assertContains(response, "Urea")


class QueryTests(TestCase):
    def setUp(self):
        self.farmer = Farmer.objects.create(name="Ramesh Kumar", phone="+919800000000", village="Sonipat")
        InventoryItem.objects.create(
            farmer=self.farmer,
            name="Urea",
            category="fertilizer",
            quantity=2,
            unit="kg",
            low_stock_threshold=5,
            expiry_date=timezone.now().date() + timedelta(days=2),
        )

    def test_low_stock_query(self):
        response = self.client.post("/query/", {"question": "what is low on stock?"})
        self.assertContains(response, "Low stock: Urea")

    def test_expiry_query(self):
        response = self.client.post("/query/", {"question": "anything expiring?"})
        self.assertContains(response, "Expiring soon: Urea")

    def test_item_name_query(self):
        answer = answer_farm_query(self.farmer, "how much urea do I have?")
        self.assertIn("2.0kg of Urea", answer)

    def test_hindi_stock_query(self):
        answer = answer_farm_query(self.farmer, "स्टॉक कम है क्या", "hi")
        self.assertIn("कम स्टॉक", answer)


class LanguageTests(TestCase):
    def test_switch_to_hindi(self):
        response = self.client.post("/language/", {"language": "hi", "next": "/"}, follow=True)
        self.assertContains(response, "नमस्ते")
        self.assertContains(response, "गेहूँ")
        self.assertEqual(Farmer.objects.get(name="Ramesh Kumar").preferred_language, "Hindi")


class VoiceTests(TestCase):
    def test_speak_without_key(self):
        with self.settings(ELEVENLABS_API_KEY=""):
            response = self.client.post(
                "/voice/speak/",
                data='{"text": "hello"}',
                content_type="application/json",
            )
        self.assertEqual(response.status_code, 503)

    def test_transcribe_without_key(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        audio = SimpleUploadedFile("q.webm", b"fake-bytes", content_type="audio/webm")
        with self.settings(ELEVENLABS_API_KEY=""):
            response = self.client.post("/voice/transcribe/", {"audio": audio})
        self.assertEqual(response.status_code, 503)

    def test_speak_with_mocked_elevenlabs(self):
        from unittest.mock import patch

        with self.settings(ELEVENLABS_API_KEY="test-key"):
            with patch("farm.integrations.requests.post") as mock_post:
                mock_post.return_value.ok = True
                mock_post.return_value.content = b"ID3fake"
                mock_post.return_value.raise_for_status = lambda: None
                response = self.client.post(
                    "/voice/speak/",
                    data='{"text": "hello farmer"}',
                    content_type="application/json",
                )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "audio/mpeg")


class UtilsTests(TestCase):
    def test_estimate_wheat_rabi(self):
        result = estimate_resources("wheat", "rabi", acres=2)
        self.assertTrue(result["found"])
        self.assertEqual(result["seed_kg"], 80)

    def test_tool_suggestions(self):
        suggestions = suggest_tools(["organic waste", "compost bin"])
        self.assertEqual(len(suggestions), 1)


class AlertCommandTests(TestCase):
    def test_creates_alerts_for_low_stock_and_expiry(self):
        farmer = Farmer.objects.create(name="Ramesh Kumar", phone="+919800000000")
        InventoryItem.objects.create(
            farmer=farmer,
            name="DAP",
            category="fertilizer",
            quantity=1,
            unit="kg",
            low_stock_threshold=5,
            expiry_date=timezone.now().date() + timedelta(days=1),
        )
        from django.core.management import call_command

        call_command("check_alerts")
        messages = list(Alert.objects.values_list("message", flat=True))
        self.assertTrue(any("Low stock" in m for m in messages))
        self.assertTrue(any("Expiry" in m for m in messages))
