"""Websocket handlers for nx-displaygrid config storage."""
from __future__ import annotations

import logging
from typing import Any

import voluptuous as vol

from homeassistant.core import HomeAssistant
from homeassistant.components import websocket_api
from homeassistant.helpers.storage import Store

STORAGE_KEY = "nx_displaygrid.config"
STORAGE_VERSION = 1
REGISTERED_FLAG = "nx_displaygrid_ws_registered"
WS_TYPE_GET_CONFIG = "nx_displaygrid/config/get"
WS_TYPE_SET_CONFIG = "nx_displaygrid/config/set"
_LOGGER = logging.getLogger(__name__)


def _store(hass: HomeAssistant) -> Store:
    return Store(hass, STORAGE_VERSION, STORAGE_KEY)


@websocket_api.websocket_command({vol.Required("type"): WS_TYPE_GET_CONFIG})
@websocket_api.async_response
async def ws_get_config(hass: HomeAssistant, connection, msg: dict) -> None:
    """Return stored nx-displaygrid config."""
    config = await _store(hass).async_load()
    connection.send_result(msg["id"], {"config": config})


@websocket_api.websocket_command(
    {vol.Required("type"): WS_TYPE_SET_CONFIG, vol.Required("config"): dict}
)
@websocket_api.async_response
async def ws_set_config(hass: HomeAssistant, connection, msg: dict) -> None:
    """Save nx-displaygrid config."""
    config: dict[str, Any] = msg.get("config") or {}
    await _store(hass).async_save(config)
    connection.send_result(msg["id"], {"ok": True})


def async_register_ws(hass: HomeAssistant) -> None:
    """Register websocket commands."""
    if hass.data.get(REGISTERED_FLAG):
        return
    websocket_api.async_register_command(hass, ws_get_config)
    websocket_api.async_register_command(hass, ws_set_config)
    hass.data[REGISTERED_FLAG] = True
    _LOGGER.info(
        "nx_displaygrid: websocket commands registered: %s, %s",
        WS_TYPE_GET_CONFIG,
        WS_TYPE_SET_CONFIG,
    )
