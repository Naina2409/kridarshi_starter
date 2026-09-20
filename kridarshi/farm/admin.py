from django.contrib import admin
from .models import Farmer, InventoryItem, Alert

admin.site.register(Farmer)
admin.site.register(InventoryItem)
admin.site.register(Alert)
