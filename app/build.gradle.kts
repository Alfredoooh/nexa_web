plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("kotlin-kapt")
}

android {
    namespace = "com.looply.social"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.looply.social"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"
    }

    signingConfigs {
        create("release") {
            storeFile = project.file("looply.keystore.jks")
            storePassword = "@jonas440243"
            keyAlias = "looply"
            keyPassword = "@jonas440243"
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            signingConfig = signingConfigs.getByName("release")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        viewBinding = true
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")

    // Navegação por fragmentos (bottom nav + drawer)
    implementation("androidx.fragment:fragment-ktx:1.8.2")
    implementation("androidx.drawerlayout:drawerlayout:1.2.0")

    // Staggered grid (Modelos) + listas (Criações)
    implementation("androidx.recyclerview:recyclerview:1.3.2")

    // Persistência local
    implementation("androidx.room:room-runtime:2.6.1")
    implementation("androidx.room:room-ktx:2.6.1")
    kapt("androidx.room:room-compiler:2.6.1")

    // Coroutines para Room/IO
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")

    // Renderização de SVG nativo (ícones do teu pack)
    implementation("com.caverock:androidsvg-aar:1.4")

    // WebView com API mais moderna para o editor
    implementation("androidx.webkit:webkit:1.11.0")
}