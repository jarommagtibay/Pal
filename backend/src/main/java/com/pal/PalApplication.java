package com.pal;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class PalApplication {

    public static void main(String[] args) {
        SpringApplication.run(PalApplication.class, args);
    }
}
