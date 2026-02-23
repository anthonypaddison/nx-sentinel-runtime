"""nx-displaygrid custom integration."""
from __future__ import annotations

from homeassistant.core import HomeAssistant

from .websocket import async_register_ws


async def _async_setup_common(hass: HomeAssistant) -> bool:
    """Shared setup path for YAML and config-entry setup."""
    async_register_ws(hass)
    return True


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Set up the nx-displaygrid integration."""
    return await _async_setup_common(hass)


async def async_setup_entry(hass: HomeAssistant, entry) -> bool:
    """Set up nx-displaygrid from a config entry."""
    return await _async_setup_common(hass)
