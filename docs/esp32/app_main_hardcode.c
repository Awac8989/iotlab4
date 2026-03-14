#include <stdio.h>
#include "nvs_flash.h"
#include "esp_event.h"
#include "esp_netif.h"
#include "esp_wifi.h"
#include "esp_log.h"
#include "mqtt_client.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#define ESP_WIFI_SSID "YOUR_SSID"
#define ESP_WIFI_PASS "YOUR_PASSWORD"
#define ESP_BROKER_IP "mqtt://192.168.1.8:1883"

static const char *TAG = "MQTT_HARDCODE";
static uint32_t MQTT_CONNECTED = 0;
static esp_mqtt_client_handle_t client = NULL;

static void wifi_init(void) {
    // Use ESP-IDF station example to implement full STA connection.
}

static void mqtt_event_handler(void *handler_args, esp_event_base_t base, int32_t event_id, void *event_data) {
    esp_mqtt_event_handle_t event = event_data;
    client = event->client;

    switch ((esp_mqtt_event_id_t)event_id) {
        case MQTT_EVENT_CONNECTED:
            MQTT_CONNECTED = 1;
            esp_mqtt_client_subscribe(client, "/test/topic1", 0);
            esp_mqtt_client_publish(client, "/test/topic", "Hello AIOT", 0, 0, 0);
            break;
        case MQTT_EVENT_DISCONNECTED:
            MQTT_CONNECTED = 0;
            break;
        case MQTT_EVENT_DATA:
            ESP_LOGI(TAG, "TOPIC=%.*s DATA=%.*s", event->topic_len, event->topic, event->data_len, event->data);
            break;
        default:
            break;
    }
}

static void mqtt_app_start(void) {
    esp_mqtt_client_config_t mqtt_cfg = {
        .broker.address.uri = ESP_BROKER_IP,
    };
    client = esp_mqtt_client_init(&mqtt_cfg);
    esp_mqtt_client_register_event(client, ESP_EVENT_ANY_ID, mqtt_event_handler, NULL);
    esp_mqtt_client_start(client);
}

static void publisher_task(void *params) {
    while (1) {
        if (MQTT_CONNECTED) {
            esp_mqtt_client_publish(client, "/test/topic", "Hello AIOT", 0, 0, 0);
        }
        vTaskDelay(pdMS_TO_TICKS(1500));
    }
}

void app_main(void) {
    ESP_ERROR_CHECK(nvs_flash_init());
    ESP_ERROR_CHECK(esp_netif_init());
    ESP_ERROR_CHECK(esp_event_loop_create_default());

    wifi_init();
    mqtt_app_start();
    xTaskCreate(publisher_task, "publisher_task", 4096, NULL, 5, NULL);
}
