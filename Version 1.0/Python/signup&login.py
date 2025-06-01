#for testing the signup and login part of the website

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
import time

service = Service(executable_path="chromedriver.exe")
driver = webdriver.Chrome(service=service)

driver.get("http://localhost:3000/")

input_element = driver.find_element(By.ID, "singup--button")
input_element.click()

def signup_form():
    input_name = driver.find_element(By.ID, "name")
    input_username = driver.find_element(By.ID, "username")
    input_email = driver.find_element(By.ID, "email")
    input_password = driver.find_element(By.ID, "password")
    input_password2 = driver.find_element(By.ID, "confirmPassword")
    input_name.click()
    input_name.send_keys("test")
    input_username.click()
    input_username.send_keys("username")
    input_email.click()
    input_email.send_keys("test@gmail.com")
    input_password.click()
    input_password.send_keys("Password123!")
    input_password2.click()
    input_password2.send_keys("Password123!" + Keys.ENTER)

def login_form():
    input_username = driver.find_element(By.ID, "username")
    input_password = driver.find_element(By.ID, "password")
    input_username.click()
    input_username.send_keys("username")
    input_password.click()
    input_password.send_keys("Password123!" + Keys.ENTER)

signup_form()
login_form()

time.sleep(10)
driver.quit()