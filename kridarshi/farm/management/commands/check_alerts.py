"""
Hour 0.5-2 / 2-3.5: run this periodically (or once before your demo) to generate
+ send alerts for low stock / expiring items.

Usage: python manage.py check_alerts
"""
from django.core.management.base import BaseCommand
from farm.models import InventoryItem, Alert
from farm.integrations import send_alert


class Command(BaseCommand):
    help = "Checks inventory for low stock / expiring items and creates + sends alerts."

    def handle(self, *args, **options):
        created = 0
        for item in InventoryItem.objects.select_related("farmer"):
            messages = []
            if item.is_low_stock:
                messages.append(f"Low stock alert: {item.name} is down to {item.quantity}{item.unit}.")
            if item.is_expiring_soon:
                messages.append(f"Expiry alert: {item.name} expires in {item.days_to_expiry} day(s).")

            for message in messages:
                if Alert.objects.filter(item=item, message=message).exists():
                    continue
                alert = Alert.objects.create(farmer=item.farmer, item=item, message=message)
                sent = send_alert(item.farmer.phone, message)
                alert.sent = sent
                alert.save()
                created += 1

        self.stdout.write(self.style.SUCCESS(f"Checked inventory. {created} new alert(s) created."))
