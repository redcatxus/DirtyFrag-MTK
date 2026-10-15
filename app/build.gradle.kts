plugins {
    id("com.android.application")
}

val appVersionName = providers.gradleProperty("versionName").orElse("3.1.1")

android {
    namespace = "df.root"
    compileSdk = 36
    ndkVersion = "28.2.13676358"

    defaultConfig {
        applicationId = "df.root"
        minSdk = 31
        targetSdk = 36
        versionCode = 8
        versionName = appVersionName.get()

        ndk {
            abiFilters += listOf("arm64-v8a")
        }
    }

    signingConfigs {
        create("debugConfig") {
            storeFile = file("${rootDir}/debug.keystore")
            storePassword = "android"
            keyAlias = "androiddebugkey"
            keyPassword = "android"
        }
    }

    buildTypes {
        debug {
            signingConfig = signingConfigs.getByName("debugConfig")
        }
        release {
            signingConfig = signingConfigs.getByName("debugConfig")
            isMinifyEnabled = false
        }
    }

    applicationVariants.all {
        val variant = this
        variant.outputs.all {
            val output = this as com.android.build.gradle.internal.api.BaseVariantOutputImpl
            variant.assembleProvider.configure {
                doLast {
                    val apk = output.outputFile
                    if (apk.exists()) {
                        val dirtyfragApk = File(apk.parentFile, "dirtyfrag.apk")
                        apk.copyTo(dirtyfragApk, overwrite = true)
                        val kittyfragApk = File(apk.parentFile, "kittyfrag.apk")
                        apk.copyTo(kittyfragApk, overwrite = true)
                    }
                }
            }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }

    lint {
        checkReleaseBuilds = false
    }

    buildFeatures {
        viewBinding = true
    }

    externalNativeBuild {
        cmake {
            path("src/main/jni/CMakeLists.txt")
        }
    }

    packaging {
        jniLibs {
            useLegacyPackaging = true
        }
    }
}

dependencies {
    implementation(libs.androidx.appcompat)
    implementation(libs.material)
    implementation(libs.androidx.constraintlayout)
}
