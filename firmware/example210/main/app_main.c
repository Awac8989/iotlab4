#include <stdio.h>
#include <string.h>
#include <inttypes.h>

#include "driver/gpio.h"
#include "driver/i2c.h"
#include "esp_event.h"
#include "esp_log.h"
#include "esp_netif.h"
#include "esp_rom_sys.h"
#include "esp_system.h"
#include "esp_timer.h"
#include "esp_wifi.h"
#include "freertos/FreeRTOS.h"
#include "freertos/event_groups.h"
#include "freertos/task.h"
#include "mqtt_client.h"
#include "nvs_flash.h"
#include "protocol_examples_common.h"

#ifndef CONFIG_LAB4_BROKER_URL
#define CONFIG_LAB4_BROKER_URL "mqtt://broker.emqx.io:1883"
#endif

#ifndef CONFIG_LAB4_MQTT_TOPIC_ROOMS
#define CONFIG_LAB4_MQTT_TOPIC_ROOMS "b556606d67dd8c7cecfab843fecbe28c/projet-IoT-2022-2023/hardware/Rooms Details"
#endif

#ifndef CONFIG_LAB4_MQTT_TOPIC_QOS0_SUB
#define CONFIG_LAB4_MQTT_TOPIC_QOS0_SUB "/topic/qos0"
#endif

#ifndef CONFIG_LAB4_MQTT_TOPIC_QOS1_PUB
#define CONFIG_LAB4_MQTT_TOPIC_QOS1_PUB "/topic/qos1"
#endif

#ifndef CONFIG_LAB4_MQTT_TOPIC_TEST_PUB
#define CONFIG_LAB4_MQTT_TOPIC_TEST_PUB "/test/topic"
#endif

#ifndef CONFIG_LAB4_MQTT_TOPIC_TEST_SUB
#define CONFIG_LAB4_MQTT_TOPIC_TEST_SUB "/test/topic1"
#endif

#ifndef CONFIG_LAB4_MQTT_TOPIC_LED_N1
#define CONFIG_LAB4_MQTT_TOPIC_LED_N1 "led/n1"
#endif

#ifndef CONFIG_LAB4_MQTT_TOPIC_LED_N2
#define CONFIG_LAB4_MQTT_TOPIC_LED_N2 "led/n2"
#endif

#ifndef CONFIG_LAB4_ROOM_NAME
#define CONFIG_LAB4_ROOM_NAME "Living Room"
#endif

#ifndef CONFIG_LAB4_DEVICE_ID
#define CONFIG_LAB4_DEVICE_ID "esp32-001"
#endif

#ifndef CONFIG_LAB4_DEVICE_NAME
#define CONFIG_LAB4_DEVICE_NAME "ESP32-BH1750-DHT"
#endif

#ifndef CONFIG_LAB4_DHT_GPIO
#define CONFIG_LAB4_DHT_GPIO 4
#endif

#ifndef CONFIG_LAB4_DHT_IS_DHT22
#define CONFIG_LAB4_DHT_IS_DHT22 1
#endif

#ifndef CONFIG_LAB4_I2C_SDA_GPIO
#define CONFIG_LAB4_I2C_SDA_GPIO 21
#endif

#ifndef CONFIG_LAB4_I2C_SCL_GPIO
#define CONFIG_LAB4_I2C_SCL_GPIO 22
#endif

#ifndef CONFIG_LAB4_LED_N1_GPIO
#define CONFIG_LAB4_LED_N1_GPIO 2
#endif

#ifndef CONFIG_LAB4_LED_N2_GPIO
#define CONFIG_LAB4_LED_N2_GPIO 15
#endif

#ifndef CONFIG_LAB4_PUBLISH_INTERVAL_MS
#define CONFIG_LAB4_PUBLISH_INTERVAL_MS 5000
#endif

#ifndef CONFIG_LAB4_WIFI_HARDCODED_SSID
#define CONFIG_LAB4_WIFI_HARDCODED_SSID "YOUR_WIFI_SSID"
#endif

#ifndef CONFIG_LAB4_WIFI_HARDCODED_PASSWORD
#define CONFIG_LAB4_WIFI_HARDCODED_PASSWORD "YOUR_WIFI_PASSWORD"
#endif

#define WIFI_CONNECTED_BIT BIT0
#define WIFI_FAIL_BIT BIT1
#define WIFI_MAX_RETRY 10

#define I2C_PORT I2C_NUM_0
#define I2C_FREQ_HZ 100000
#define BH1750_ADDR 0x23

static const char *TAG = "LAB4_ESP32";
static esp_mqtt_client_handle_t s_mqtt_client = NULL;
static bool s_mqtt_connected = false;

static esp_err_t bh1750_write_byte(uint8_t data)
{
    i2c_cmd_handle_t cmd = i2c_cmd_link_create();
    i2c_master_start(cmd);
    i2c_master_write_byte(cmd, (BH1750_ADDR << 1) | I2C_MASTER_WRITE, true);
    i2c_master_write_byte(cmd, data, true);
    i2c_master_stop(cmd);
    esp_err_t ret = i2c_master_cmd_begin(I2C_PORT, cmd, pdMS_TO_TICKS(200));
    i2c_cmd_link_delete(cmd);
    return ret;
}

static esp_err_t bh1750_init(void)
{
    i2c_config_t conf = {
        .mode = I2C_MODE_MASTER,
        .sda_io_num = CONFIG_LAB4_I2C_SDA_GPIO,
        .scl_io_num = CONFIG_LAB4_I2C_SCL_GPIO,
        .sda_pullup_en = GPIO_PULLUP_ENABLE,
        .scl_pullup_en = GPIO_PULLUP_ENABLE,
        .master.clk_speed = I2C_FREQ_HZ,
    };

    ESP_ERROR_CHECK(i2c_param_config(I2C_PORT, &conf));
    ESP_ERROR_CHECK(i2c_driver_install(I2C_PORT, I2C_MODE_MASTER, 0, 0, 0));

    ESP_ERROR_CHECK(bh1750_write_byte(0x01));
    ESP_ERROR_CHECK(bh1750_write_byte(0x07));
    ESP_ERROR_CHECK(bh1750_write_byte(0x10));
    return ESP_OK;
}

static esp_err_t bh1750_read_lux(float *lux)
{
    uint8_t raw[2] = {0};
    esp_err_t ret = i2c_master_read_from_device(I2C_PORT, BH1750_ADDR, raw, sizeof(raw), pdMS_TO_TICKS(250));
    if (ret != ESP_OK)
    {
        return ret;
    }

    uint16_t level = (raw[0] << 8) | raw[1];
    *lux = (float)level / 1.2f;
    return ESP_OK;
}

static int dht_wait_level(int expected_level, int timeout_us)
{
    int64_t start = esp_timer_get_time();
    while (gpio_get_level(CONFIG_LAB4_DHT_GPIO) == expected_level)
    {
        if ((esp_timer_get_time() - start) > timeout_us)
        {
            return -1;
        }
    }
    return 0;
}

static esp_err_t dht_read(float *temperature, float *humidity)
{
    uint8_t data[5] = {0};

    gpio_set_direction(CONFIG_LAB4_DHT_GPIO, GPIO_MODE_OUTPUT);
    gpio_set_level(CONFIG_LAB4_DHT_GPIO, 0);
    vTaskDelay(pdMS_TO_TICKS(20));
    gpio_set_level(CONFIG_LAB4_DHT_GPIO, 1);
    esp_rom_delay_us(30);
    gpio_set_direction(CONFIG_LAB4_DHT_GPIO, GPIO_MODE_INPUT);
    gpio_set_pull_mode(CONFIG_LAB4_DHT_GPIO, GPIO_PULLUP_ONLY);

    if (dht_wait_level(1, 90) < 0 || dht_wait_level(0, 110) < 0 || dht_wait_level(1, 110) < 0)
    {
        return ESP_FAIL;
    }

    for (int i = 0; i < 40; i++)
    {
        if (dht_wait_level(0, 70) < 0)
        {
            return ESP_FAIL;
        }

        int64_t high_start = esp_timer_get_time();
        if (dht_wait_level(1, 120) < 0)
        {
            return ESP_FAIL;
        }
        int64_t high_us = esp_timer_get_time() - high_start;

        data[i / 8] <<= 1;
        if (high_us > 40)
        {
            data[i / 8] |= 1;
        }
    }

    uint8_t checksum = (uint8_t)(data[0] + data[1] + data[2] + data[3]);
    if (checksum != data[4])
    {
        return ESP_FAIL;
    }

#if CONFIG_LAB4_DHT_IS_DHT22
    uint16_t raw_h = ((uint16_t)data[0] << 8) | data[1];
    uint16_t raw_t = ((uint16_t)data[2] << 8) | data[3];

    *humidity = raw_h / 10.0f;
    if (raw_t & 0x8000)
    {
        raw_t &= 0x7FFF;
        *temperature = -((float)raw_t / 10.0f);
    }
    else
    {
        *temperature = raw_t / 10.0f;
    }
#else
    *humidity = (float)data[0];
    *temperature = (float)data[2];
#endif

    return ESP_OK;
}

static void set_led_state(gpio_num_t pin, const char *payload, int len)
{
    if (len <= 0)
    {
        return;
    }

    char ch0 = payload[0];
    bool on = (ch0 == '1' || ch0 == 'T' || ch0 == 't' || ch0 == 'Y' || ch0 == 'y' || ch0 == 'O' || ch0 == 'o');

    gpio_set_level(pin, on ? 1 : 0);
    ESP_LOGI(TAG, "LED GPIO %d -> %s", pin, on ? "ON" : "OFF");
}

static void mqtt_event_handler(void *handler_args, esp_event_base_t base, int32_t event_id, void *event_data)
{
    esp_mqtt_event_handle_t event = event_data;
    esp_mqtt_client_handle_t client = event->client;

    switch ((esp_mqtt_event_id_t)event_id)
    {
    case MQTT_EVENT_CONNECTED:
        s_mqtt_connected = true;
        ESP_LOGI(TAG, "MQTT connected");

        esp_mqtt_client_subscribe(client, CONFIG_LAB4_MQTT_TOPIC_QOS0_SUB, 0);
        esp_mqtt_client_subscribe(client, CONFIG_LAB4_MQTT_TOPIC_TEST_SUB, 1);
        esp_mqtt_client_subscribe(client, CONFIG_LAB4_MQTT_TOPIC_LED_N1, 1);
        esp_mqtt_client_subscribe(client, CONFIG_LAB4_MQTT_TOPIC_LED_N2, 1);

        esp_mqtt_client_publish(client, CONFIG_LAB4_MQTT_TOPIC_QOS1_PUB, "Hi from the IoT application", 0, 1, 0);
        break;

    case MQTT_EVENT_DISCONNECTED:
        s_mqtt_connected = false;
        ESP_LOGW(TAG, "MQTT disconnected");
        break;

    case MQTT_EVENT_DATA:
        ESP_LOGI(TAG, "MQTT DATA topic=%.*s payload=%.*s", event->topic_len, event->topic, event->data_len, event->data);

        if ((int)strlen(CONFIG_LAB4_MQTT_TOPIC_LED_N1) == event->topic_len &&
            strncmp(event->topic, CONFIG_LAB4_MQTT_TOPIC_LED_N1, event->topic_len) == 0)
        {
            set_led_state(CONFIG_LAB4_LED_N1_GPIO, event->data, event->data_len);
        }
        else if ((int)strlen(CONFIG_LAB4_MQTT_TOPIC_LED_N2) == event->topic_len &&
                 strncmp(event->topic, CONFIG_LAB4_MQTT_TOPIC_LED_N2, event->topic_len) == 0)
        {
            set_led_state(CONFIG_LAB4_LED_N2_GPIO, event->data, event->data_len);
        }
        break;

    case MQTT_EVENT_ERROR:
        ESP_LOGE(TAG, "MQTT error");
        break;

    default:
        break;
    }
}

static esp_err_t wifi_connect_selected(void)
{
#if CONFIG_LAB4_WIFI_MODE_HARDCODED
    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&cfg));

    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA));

    wifi_config_t wifi_config = {
        .sta = {
            .threshold.authmode = WIFI_AUTH_WPA2_PSK,
        },
    };

    strncpy((char *)wifi_config.sta.ssid, CONFIG_LAB4_WIFI_HARDCODED_SSID, sizeof(wifi_config.sta.ssid) - 1);
    strncpy((char *)wifi_config.sta.password, CONFIG_LAB4_WIFI_HARDCODED_PASSWORD, sizeof(wifi_config.sta.password) - 1);

    ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_STA, &wifi_config));
    ESP_ERROR_CHECK(esp_wifi_start());
    ESP_ERROR_CHECK(esp_wifi_connect());

    ESP_LOGI(TAG, "Hardcoded WiFi connect triggered: SSID=%s", CONFIG_LAB4_WIFI_HARDCODED_SSID);
    vTaskDelay(pdMS_TO_TICKS(5000));
    return ESP_OK;
#else
    ESP_LOGI(TAG, "Using example_connect (menuconfig/BLE provisioning mode)");
    return example_connect();
#endif
}

static void mqtt_app_start(void)
{
    esp_mqtt_client_config_t mqtt_cfg = {
        .broker.address.uri = CONFIG_LAB4_BROKER_URL,
    };

    s_mqtt_client = esp_mqtt_client_init(&mqtt_cfg);
    esp_mqtt_client_register_event(s_mqtt_client, ESP_EVENT_ANY_ID, mqtt_event_handler, NULL);
    esp_mqtt_client_start(s_mqtt_client);
}

static void sensor_publish_task(void *arg)
{
    float temperature = 0.0f;
    float humidity = 0.0f;
    float light = 0.0f;
    char payload[320];

    while (1)
    {
        if (s_mqtt_connected)
        {
            if (dht_read(&temperature, &humidity) != ESP_OK)
            {
                ESP_LOGW(TAG, "DHT read failed, keeping previous values");
            }

            if (bh1750_read_lux(&light) != ESP_OK)
            {
                ESP_LOGW(TAG, "BH1750 read failed, keeping previous value");
            }

            snprintf(payload,
                     sizeof(payload),
                     "{\"Room\":\"%s\",\"deviceId\":\"%s\",\"deviceName\":\"%s\",\"Measured Temperature\":%.1f,\"Measured Humidity\":%.1f,\"Measured Light\":%.1f,\"temperature\":%.1f,\"humidity\":%.1f,\"light\":%.1f}",
                     CONFIG_LAB4_ROOM_NAME,
                     CONFIG_LAB4_DEVICE_ID,
                     CONFIG_LAB4_DEVICE_NAME,
                     temperature,
                     humidity,
                     light,
                     temperature,
                     humidity,
                     light);

            esp_mqtt_client_publish(s_mqtt_client, CONFIG_LAB4_MQTT_TOPIC_ROOMS, payload, 0, 0, 0);
            esp_mqtt_client_publish(s_mqtt_client, CONFIG_LAB4_MQTT_TOPIC_TEST_PUB, "Hello AIOT", 0, 1, 0);

            ESP_LOGI(TAG,
                     "Published sensor data -> T=%.1fC H=%.1f%% L=%.1flux",
                     temperature,
                     humidity,
                     light);
        }

        vTaskDelay(pdMS_TO_TICKS(CONFIG_LAB4_PUBLISH_INTERVAL_MS));
    }
}

void app_main(void)
{
    ESP_LOGI(TAG, "[APP] Startup");
    ESP_LOGI(TAG, "[APP] Free memory: %" PRIu32 " bytes", esp_get_free_heap_size());
    ESP_LOGI(TAG, "[APP] IDF version: %s", esp_get_idf_version());

    esp_err_t ret = nvs_flash_init();
    if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND)
    {
        ESP_ERROR_CHECK(nvs_flash_erase());
        ret = nvs_flash_init();
    }
    ESP_ERROR_CHECK(ret);

    ESP_ERROR_CHECK(esp_netif_init());
    ESP_ERROR_CHECK(esp_event_loop_create_default());
    esp_netif_t *sta_netif = esp_netif_create_default_wifi_sta();
    if (sta_netif == NULL)
    {
        ESP_LOGE(TAG, "Cannot create default WiFi STA netif");
        return;
    }

    gpio_reset_pin(CONFIG_LAB4_LED_N1_GPIO);
    gpio_set_direction(CONFIG_LAB4_LED_N1_GPIO, GPIO_MODE_OUTPUT);
    gpio_set_level(CONFIG_LAB4_LED_N1_GPIO, 0);

    gpio_reset_pin(CONFIG_LAB4_LED_N2_GPIO);
    gpio_set_direction(CONFIG_LAB4_LED_N2_GPIO, GPIO_MODE_OUTPUT);
    gpio_set_level(CONFIG_LAB4_LED_N2_GPIO, 0);

    ESP_ERROR_CHECK(bh1750_init());

    ESP_ERROR_CHECK(wifi_connect_selected());
    mqtt_app_start();

    xTaskCreate(sensor_publish_task, "sensor_publish_task", 4096, NULL, 5, NULL);
}
