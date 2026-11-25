import { mkdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
const execFileAsync = promisify(execFile)

export const DEFAULT_FOCUS_ALBUM_BASE_URL =
  'https://github.com/easychen/jing-chan-os/releases/download/focus-albums-v1'

export const FOCUS_ALBUMS_CATALOG = [
  {
    "id": "echoes",
    "name": "回声重映集",
    "en": "Echoes Replayed",
    "desc": "雨夜深海与模拟磁带的温柔回响",
    "cover": "/jphone/media/focus/covers/echoes.jpg",
    "tracks": [
      {
        "id": "lofi-rain-a",
        "num": "01",
        "name": "雨的假设 A",
        "en": "Hypothesis of Rain A",
        "albumId": "echoes",
        "album": "回声重映集",
        "file": "回声重映集_01_雨的假设A_Hypothesis_of_Rain.mp3",
        "assetName": "echoes_01.mp3",
        "builtin": true,
        "bytes": 1539805
      },
      {
        "id": "echoes-02",
        "num": "02",
        "name": "雨的假设 B",
        "en": "Hypothesis of Rain B",
        "albumId": "echoes",
        "album": "回声重映集",
        "file": "回声重映集_02_雨的假设B_Hypothesis_of_Rain.mp3",
        "assetName": "echoes_02.mp3",
        "builtin": false,
        "bytes": 1639488
      },
      {
        "id": "lofi-leaves-a",
        "num": "03",
        "name": "叶的呼吸 A",
        "en": "Respiration of Leaves A",
        "albumId": "echoes",
        "album": "回声重映集",
        "file": "回声重映集_03_叶的呼吸A_Respiration_of_Leaves.mp3",
        "assetName": "echoes_03.mp3",
        "builtin": true,
        "bytes": 1938538
      },
      {
        "id": "echoes-04",
        "num": "04",
        "name": "叶的呼吸 B",
        "en": "Respiration of Leaves B",
        "albumId": "echoes",
        "album": "回声重映集",
        "file": "回声重映集_04_叶的呼吸B_Respiration_of_Leaves.mp3",
        "assetName": "echoes_04.mp3",
        "builtin": false,
        "bytes": 1740426
      },
      {
        "id": "lofi-waves-a",
        "num": "05",
        "name": "浪的层叠 A",
        "en": "Folding the Waves A",
        "albumId": "echoes",
        "album": "回声重映集",
        "file": "回声重映集_05_浪的层叠A_Folding_the_Waves.mp3",
        "assetName": "echoes_05.mp3",
        "builtin": true,
        "bytes": 1115995
      },
      {
        "id": "echoes-06",
        "num": "06",
        "name": "浪的层叠 B",
        "en": "Folding the Waves B",
        "albumId": "echoes",
        "album": "回声重映集",
        "file": "回声重映集_06_浪的层叠B_Folding_the_Waves.mp3",
        "assetName": "echoes_06.mp3",
        "builtin": false,
        "bytes": 1392788
      },
      {
        "id": "lofi-embers-a",
        "num": "07",
        "name": "篝火余烬 A",
        "en": "Embers of Civilization A",
        "albumId": "echoes",
        "album": "回声重映集",
        "file": "回声重映集_07_篝火余烬A_Embers_of_Civilization.mp3",
        "assetName": "echoes_07.mp3",
        "builtin": true,
        "bytes": 1536357
      },
      {
        "id": "echoes-08",
        "num": "08",
        "name": "篝火余烬 B",
        "en": "Embers of Civilization B",
        "albumId": "echoes",
        "album": "回声重映集",
        "file": "回声重映集_08_篝火余烬B_Embers_of_Civilization.mp3",
        "assetName": "echoes_08.mp3",
        "builtin": false,
        "bytes": 1680239
      },
      {
        "id": "echoes-09",
        "num": "09",
        "name": "书页折痕 A",
        "en": "Creases of Time A",
        "albumId": "echoes",
        "album": "回声重映集",
        "file": "回声重映集_09_书页折痕A_Creases_of_Time.mp3",
        "assetName": "echoes_09.mp3",
        "builtin": false,
        "bytes": 3073924
      },
      {
        "id": "echoes-10",
        "num": "10",
        "name": "书页折痕 B",
        "en": "Creases of Time B",
        "albumId": "echoes",
        "album": "回声重映集",
        "file": "回声重映集_10_书页折痕B_Creases_of_Time.mp3",
        "assetName": "echoes_10.mp3",
        "builtin": false,
        "bytes": 2899635
      },
      {
        "id": "lofi-stars-a",
        "num": "11",
        "name": "星空幻梦 A",
        "en": "Echoes from Light Years A",
        "albumId": "echoes",
        "album": "回声重映集",
        "file": "回声重映集_11_星空幻梦A_Echoes_from_Light_Years.mp3",
        "assetName": "echoes_11.mp3",
        "builtin": true,
        "bytes": 2728795
      },
      {
        "id": "echoes-12",
        "num": "12",
        "name": "星空幻梦 B",
        "en": "Echoes from Light Years B",
        "albumId": "echoes",
        "album": "回声重映集",
        "file": "回声重映集_12_星空幻梦B_Echoes_from_Light_Years.mp3",
        "assetName": "echoes_12.mp3",
        "builtin": false,
        "bytes": 2166430
      },
      {
        "id": "echoes-13",
        "num": "13",
        "name": "磐石涟漪 A",
        "en": "Ripples and Stone A",
        "albumId": "echoes",
        "album": "回声重映集",
        "file": "回声重映集_13_磐石涟漪A_Ripples_and_Stone.mp3",
        "assetName": "echoes_13.mp3",
        "builtin": false,
        "bytes": 1935717
      },
      {
        "id": "echoes-14",
        "num": "14",
        "name": "磐石涟漪 B",
        "en": "Ripples and Stone B",
        "albumId": "echoes",
        "album": "回声重映集",
        "file": "回声重映集_14_磐石涟漪B_Ripples_and_Stone.mp3",
        "assetName": "echoes_14.mp3",
        "builtin": false,
        "bytes": 1727887
      },
      {
        "id": "echoes-15",
        "num": "15",
        "name": "雪夜独屋 A",
        "en": "Sealed by Snow A",
        "albumId": "echoes",
        "album": "回声重映集",
        "file": "回声重映集_15_雪夜独屋A_Sealed_by_Snow.mp3",
        "assetName": "echoes_15.mp3",
        "builtin": false,
        "bytes": 1670835
      },
      {
        "id": "echoes-16",
        "num": "16",
        "name": "雪夜独屋 B",
        "en": "Sealed by Snow B",
        "albumId": "echoes",
        "album": "回声重映集",
        "file": "回声重映集_16_雪夜独屋B_Sealed_by_Snow.mp3",
        "assetName": "echoes_16.mp3",
        "builtin": false,
        "bytes": 1760174
      },
      {
        "id": "lofi-cafe-a",
        "num": "17",
        "name": "午夜咖啡馆 A",
        "en": "Solace in Third Space A",
        "albumId": "echoes",
        "album": "回声重映集",
        "file": "回声重映集_17_午夜咖啡馆A_Solace_in_Third_Space.mp3",
        "assetName": "echoes_17.mp3",
        "builtin": true,
        "bytes": 1469275
      },
      {
        "id": "echoes-18",
        "num": "18",
        "name": "午夜咖啡馆 B",
        "en": "Solace in Third Space B",
        "albumId": "echoes",
        "album": "回声重映集",
        "file": "回声重映集_18_午夜咖啡馆B_Solace_in_Third_Space.mp3",
        "assetName": "echoes_18.mp3",
        "builtin": false,
        "bytes": 1679926
      },
      {
        "id": "echoes-19",
        "num": "19",
        "name": "绿皮列车 A",
        "en": "Fluid Landscapes A",
        "albumId": "echoes",
        "album": "回声重映集",
        "file": "回声重映集_19_绿皮列车A_Fluid_Landscapes.mp3",
        "assetName": "echoes_19.mp3",
        "builtin": false,
        "bytes": 1639175
      },
      {
        "id": "echoes-20",
        "num": "20",
        "name": "绿皮列车 B",
        "en": "Fluid Landscapes B",
        "albumId": "echoes",
        "album": "回声重映集",
        "file": "回声重映集_20_绿皮列车B_Fluid_Landscapes.mp3",
        "assetName": "echoes_20.mp3",
        "builtin": false,
        "bytes": 1456736
      },
      {
        "id": "echoes-21",
        "num": "21",
        "name": "漫步平流层 A",
        "en": "Stratospheric Walk A",
        "albumId": "echoes",
        "album": "回声重映集",
        "file": "回声重映集_21_漫步平流层A_Stratospheric_Walk.mp3",
        "assetName": "echoes_21.mp3",
        "builtin": false,
        "bytes": 1620367
      },
      {
        "id": "echoes-22",
        "num": "22",
        "name": "漫步平流层 B",
        "en": "Stratospheric Walk B",
        "albumId": "echoes",
        "album": "回声重映集",
        "file": "回声重映集_22_漫步平流层B_Stratospheric_Walk.mp3",
        "assetName": "echoes_22.mp3",
        "builtin": false,
        "bytes": 1694659
      }
    ],
    "totalBytes": 40107171
  },
  {
    "id": "emotion-pawnshop",
    "name": "情绪典当行",
    "en": "Emotion Pawnshop",
    "desc": "深夜奇物馆里寄存的星尘与琥珀情绪",
    "cover": "/jphone/media/focus/covers/emotion-pawnshop.jpg",
    "tracks": [
      {
        "id": "emotion-pawnshop-01",
        "num": "01",
        "name": "透过叶缝的光 A",
        "en": "Light Through Leaves A",
        "albumId": "emotion-pawnshop",
        "album": "情绪典当行",
        "file": "情绪典当行_01_透过叶缝的光A_Light_Through_Leaves.mp3",
        "assetName": "emotion-pawnshop_01.mp3",
        "builtin": false,
        "bytes": 2064239
      },
      {
        "id": "emotion-pawnshop-02",
        "num": "02",
        "name": "透过叶缝的光 B",
        "en": "Light Through Leaves B",
        "albumId": "emotion-pawnshop",
        "album": "情绪典当行",
        "file": "情绪典当行_02_透过叶缝的光B_Light_Through_Leaves.mp3",
        "assetName": "emotion-pawnshop_02.mp3",
        "builtin": false,
        "bytes": 1620367
      },
      {
        "id": "emotion-pawnshop-03",
        "num": "03",
        "name": "雨季的标本 A",
        "en": "Specimen of Rainy Season A",
        "albumId": "emotion-pawnshop",
        "album": "情绪典当行",
        "file": "情绪典当行_03_雨季的标本A_Specimen_of_Rainy_Season.mp3",
        "assetName": "emotion-pawnshop_03.mp3",
        "builtin": false,
        "bytes": 1644817
      },
      {
        "id": "emotion-pawnshop-04",
        "num": "04",
        "name": "雨季的标本 B",
        "en": "Specimen of Rainy Season B",
        "albumId": "emotion-pawnshop",
        "album": "情绪典当行",
        "file": "情绪典当行_04_雨季的标本B_Specimen_of_Rainy_Season.mp3",
        "assetName": "emotion-pawnshop_04.mp3",
        "builtin": false,
        "bytes": 1921297
      },
      {
        "id": "emotion-pawnshop-05",
        "num": "05",
        "name": "摆渡人的桨 A",
        "en": "Oar of the Ferryman A",
        "albumId": "emotion-pawnshop",
        "album": "情绪典当行",
        "file": "情绪典当行_05_摆渡人的桨A_Oar_of_the_Ferryman.mp3",
        "assetName": "emotion-pawnshop_05.mp3",
        "builtin": false,
        "bytes": 1695599
      },
      {
        "id": "emotion-pawnshop-06",
        "num": "06",
        "name": "摆渡人的桨 B",
        "en": "Oar of the Ferryman B",
        "albumId": "emotion-pawnshop",
        "album": "情绪典当行",
        "file": "情绪典当行_06_摆渡人的桨B_Oar_of_the_Ferryman.mp3",
        "assetName": "emotion-pawnshop_06.mp3",
        "builtin": false,
        "bytes": 1905937
      },
      {
        "id": "emotion-pawnshop-07",
        "num": "07",
        "name": "泛黄的时间轴 A",
        "en": "Sepia Timeline A",
        "albumId": "emotion-pawnshop",
        "album": "情绪典当行",
        "file": "情绪典当行_07_泛黄的时间轴A_Sepia_Timeline.mp3",
        "assetName": "emotion-pawnshop_07.mp3",
        "builtin": false,
        "bytes": 1794969
      },
      {
        "id": "emotion-pawnshop-08",
        "num": "08",
        "name": "泛黄的时间轴 B",
        "en": "Sepia Timeline B",
        "albumId": "emotion-pawnshop",
        "album": "情绪典当行",
        "file": "情绪典当行_08_泛黄的时间轴B_Sepia_Timeline.mp3",
        "assetName": "emotion-pawnshop_08.mp3",
        "builtin": false,
        "bytes": 1893399
      },
      {
        "id": "emotion-pawnshop-09",
        "num": "09",
        "name": "独奏者的星球 A",
        "en": "Planet of the Soloist A",
        "albumId": "emotion-pawnshop",
        "album": "情绪典当行",
        "file": "情绪典当行_09_独奏者的星球A_Planet_of_the_Soloist.mp3",
        "assetName": "emotion-pawnshop_09.mp3",
        "builtin": false,
        "bytes": 1920357
      },
      {
        "id": "emotion-pawnshop-10",
        "num": "10",
        "name": "独奏者的星球 B",
        "en": "Planet of the Soloist B",
        "albumId": "emotion-pawnshop",
        "album": "情绪典当行",
        "file": "情绪典当行_10_独奏者的星球B_Planet_of_the_Soloist.mp3",
        "assetName": "emotion-pawnshop_10.mp3",
        "builtin": false,
        "bytes": 1536670
      },
      {
        "id": "emotion-pawnshop-11",
        "num": "11",
        "name": "深海的消音室 A",
        "en": "Anechoic Chamber of Deep Sea A",
        "albumId": "emotion-pawnshop",
        "album": "情绪典当行",
        "file": "情绪典当行_11_深海的消音室A_Anechoic_Chamber_of_Deep_Sea.mp3",
        "assetName": "emotion-pawnshop_11.mp3",
        "builtin": false,
        "bytes": 2036654
      },
      {
        "id": "emotion-pawnshop-12",
        "num": "12",
        "name": "深海的消音室 B",
        "en": "Anechoic Chamber of Deep Sea B",
        "albumId": "emotion-pawnshop",
        "album": "情绪典当行",
        "file": "情绪典当行_12_深海的消音室B_Anechoic_Chamber_of_Deep_Sea.mp3",
        "assetName": "emotion-pawnshop_12.mp3",
        "builtin": false,
        "bytes": 1720050
      },
      {
        "id": "emotion-pawnshop-13",
        "num": "13",
        "name": "破晓的调率 A",
        "en": "Algorithm of Daybreak A",
        "albumId": "emotion-pawnshop",
        "album": "情绪典当行",
        "file": "情绪典当行_13_破晓的调率A_Algorithm_of_Daybreak.mp3",
        "assetName": "emotion-pawnshop_13.mp3",
        "builtin": false,
        "bytes": 1500308
      },
      {
        "id": "emotion-pawnshop-14",
        "num": "14",
        "name": "破晓的调率 B",
        "en": "Algorithm of Daybreak B",
        "albumId": "emotion-pawnshop",
        "album": "情绪典当行",
        "file": "情绪典当行_14_破晓的调率B_Algorithm_of_Daybreak.mp3",
        "assetName": "emotion-pawnshop_14.mp3",
        "builtin": false,
        "bytes": 2062986
      },
      {
        "id": "emotion-pawnshop-15",
        "num": "15",
        "name": "迷雾中的导航 A",
        "en": "Navigation in Fog A",
        "albumId": "emotion-pawnshop",
        "album": "情绪典当行",
        "file": "情绪典当行_15_迷雾中的导航A_Navigation_in_Fog.mp3",
        "assetName": "emotion-pawnshop_15.mp3",
        "builtin": false,
        "bytes": 2026310
      },
      {
        "id": "emotion-pawnshop-16",
        "num": "16",
        "name": "迷雾中的导航 B",
        "en": "Navigation in Fog B",
        "albumId": "emotion-pawnshop",
        "album": "情绪典当行",
        "file": "情绪典当行_16_迷雾中的导航B_Navigation_in_Fog.mp3",
        "assetName": "emotion-pawnshop_16.mp3",
        "builtin": false,
        "bytes": 2418460
      },
      {
        "id": "emotion-pawnshop-17",
        "num": "17",
        "name": "灵魂平躺仪式 A",
        "en": "Low Power Soul A",
        "albumId": "emotion-pawnshop",
        "album": "情绪典当行",
        "file": "情绪典当行_17_灵魂平躺仪式A_Low_Power_Soul.mp3",
        "assetName": "emotion-pawnshop_17.mp3",
        "builtin": false,
        "bytes": 2046999
      },
      {
        "id": "emotion-pawnshop-18",
        "num": "18",
        "name": "灵魂平躺仪式 B",
        "en": "Low Power Soul B",
        "albumId": "emotion-pawnshop",
        "album": "情绪典当行",
        "file": "情绪典当行_18_灵魂平躺仪式B_Low_Power_Soul.mp3",
        "assetName": "emotion-pawnshop_18.mp3",
        "builtin": false,
        "bytes": 2052955
      },
      {
        "id": "emotion-pawnshop-19",
        "num": "19",
        "name": "温柔的奇点 A",
        "en": "Singularity of Tenderness A",
        "albumId": "emotion-pawnshop",
        "album": "情绪典当行",
        "file": "情绪典当行_19_温柔的奇点A_Singularity_of_Tenderness.mp3",
        "assetName": "emotion-pawnshop_19.mp3",
        "builtin": false,
        "bytes": 1680239
      },
      {
        "id": "emotion-pawnshop-20",
        "num": "20",
        "name": "温柔的奇点 B",
        "en": "Singularity of Tenderness B",
        "albumId": "emotion-pawnshop",
        "album": "情绪典当行",
        "file": "情绪典当行_20_温柔的奇点B_Singularity_of_Tenderness.mp3",
        "assetName": "emotion-pawnshop_20.mp3",
        "builtin": false,
        "bytes": 1472409
      },
      {
        "id": "emotion-pawnshop-21",
        "num": "21",
        "name": "逻辑的水晶 A",
        "en": "Crystal of Logic A",
        "albumId": "emotion-pawnshop",
        "album": "情绪典当行",
        "file": "情绪典当行_21_逻辑的水晶A_Crystal_of_Logic.mp3",
        "assetName": "emotion-pawnshop_21.mp3",
        "builtin": false,
        "bytes": 1728827
      },
      {
        "id": "emotion-pawnshop-22",
        "num": "22",
        "name": "逻辑的水晶 B",
        "en": "Crystal of Logic B",
        "albumId": "emotion-pawnshop",
        "album": "情绪典当行",
        "file": "情绪典当行_22_逻辑的水晶B_Crystal_of_Logic.mp3",
        "assetName": "emotion-pawnshop_22.mp3",
        "builtin": false,
        "bytes": 1794656
      },
      {
        "id": "emotion-pawnshop-23",
        "num": "23",
        "name": "归零的艺术 A",
        "en": "Art of Zero A",
        "albumId": "emotion-pawnshop",
        "album": "情绪典当行",
        "file": "情绪典当行_23_归零的艺术A_Art_of_Zero.mp3",
        "assetName": "emotion-pawnshop_23.mp3",
        "builtin": false,
        "bytes": 1860484
      },
      {
        "id": "emotion-pawnshop-24",
        "num": "24",
        "name": "归零的艺术 B",
        "en": "Art of Zero B",
        "albumId": "emotion-pawnshop",
        "album": "情绪典当行",
        "file": "情绪典当行_24_归零的艺术B_Art_of_Zero.mp3",
        "assetName": "emotion-pawnshop_24.mp3",
        "builtin": false,
        "bytes": 2110319
      },
      {
        "id": "emotion-pawnshop-25",
        "num": "25",
        "name": "躺于琥珀 A",
        "en": "Lying in Amber A",
        "albumId": "emotion-pawnshop",
        "album": "情绪典当行",
        "file": "情绪典当行_25_躺于琥珀A_Lying_in_Amber.mp3",
        "assetName": "emotion-pawnshop_25.mp3",
        "builtin": false,
        "bytes": 1261758
      },
      {
        "id": "emotion-pawnshop-26",
        "num": "26",
        "name": "躺于琥珀 B",
        "en": "Lying in Amber B",
        "albumId": "emotion-pawnshop",
        "album": "情绪典当行",
        "file": "情绪典当行_26_躺于琥珀B_Lying_in_Amber.mp3",
        "assetName": "emotion-pawnshop_26.mp3",
        "builtin": false,
        "bytes": 2217839
      },
      {
        "id": "emotion-pawnshop-27",
        "num": "27",
        "name": "寂静贩卖机 A",
        "en": "Silence Vending Machine A",
        "albumId": "emotion-pawnshop",
        "album": "情绪典当行",
        "file": "情绪典当行_27_寂静贩卖机A_Silence_Vending_Machine.mp3",
        "assetName": "emotion-pawnshop_27.mp3",
        "builtin": false,
        "bytes": 1591528
      },
      {
        "id": "emotion-pawnshop-28",
        "num": "28",
        "name": "寂静贩卖机 B",
        "en": "Silence Vending Machine B",
        "albumId": "emotion-pawnshop",
        "album": "情绪典当行",
        "file": "情绪典当行_28_寂静贩卖机B_Silence_Vending_Machine.mp3",
        "assetName": "emotion-pawnshop_28.mp3",
        "builtin": false,
        "bytes": 1529774
      },
      {
        "id": "emotion-pawnshop-29",
        "num": "29",
        "name": "第25小时 A",
        "en": "The 25th Hour A",
        "albumId": "emotion-pawnshop",
        "album": "情绪典当行",
        "file": "情绪典当行_29_第25小时A_The_25th_Hour.mp3",
        "assetName": "emotion-pawnshop_29.mp3",
        "builtin": false,
        "bytes": 1705317
      },
      {
        "id": "emotion-pawnshop-30",
        "num": "30",
        "name": "第25小时 B",
        "en": "The 25th Hour B",
        "albumId": "emotion-pawnshop",
        "album": "情绪典当行",
        "file": "情绪典当行_30_第25小时B_The_25th_Hour.mp3",
        "assetName": "emotion-pawnshop_30.mp3",
        "builtin": false,
        "bytes": 1390907
      }
    ],
    "totalBytes": 54206430
  },
  {
    "id": "time-sync",
    "name": "时光同频器",
    "en": "Time Synchronizer",
    "desc": "金色海岸列车与玻璃温室的午后白日梦",
    "cover": "/jphone/media/focus/covers/time-sync.jpg",
    "tracks": [
      {
        "id": "time-sync-01",
        "num": "01",
        "name": "光合苏醒 A",
        "en": "Photosynthesis of Soul A",
        "albumId": "time-sync",
        "album": "时光同频器",
        "file": "时光同频器_01_光合苏醒A_Photosynthesis_of_Soul.mp3",
        "assetName": "time-sync_01.mp3",
        "builtin": false,
        "bytes": 1524445
      },
      {
        "id": "time-sync-02",
        "num": "02",
        "name": "光合苏醒 B",
        "en": "Photosynthesis of Soul B",
        "albumId": "time-sync",
        "album": "时光同频器",
        "file": "时光同频器_02_光合苏醒B_Photosynthesis_of_Soul.mp3",
        "assetName": "time-sync_02.mp3",
        "builtin": false,
        "bytes": 1407835
      },
      {
        "id": "time-sync-03",
        "num": "03",
        "name": "城市游牧 A",
        "en": "Urban Nomadism A",
        "albumId": "time-sync",
        "album": "时光同频器",
        "file": "时光同频器_03_城市游牧A_Urban_Nomadism.mp3",
        "assetName": "time-sync_03.mp3",
        "builtin": false,
        "bytes": 2191508
      },
      {
        "id": "time-sync-04",
        "num": "04",
        "name": "城市游牧 B",
        "en": "Urban Nomadism B",
        "albumId": "time-sync",
        "album": "时光同频器",
        "file": "时光同频器_04_城市游牧B_Urban_Nomadism.mp3",
        "assetName": "time-sync_04.mp3",
        "builtin": false,
        "bytes": 1894026
      },
      {
        "id": "time-sync-05",
        "num": "05",
        "name": "逻辑秩序 A",
        "en": "Order of Logic A",
        "albumId": "time-sync",
        "album": "时光同频器",
        "file": "时光同频器_05_逻辑秩序A_Order_of_Logic.mp3",
        "assetName": "time-sync_05.mp3",
        "builtin": false,
        "bytes": 1380249
      },
      {
        "id": "time-sync-06",
        "num": "06",
        "name": "逻辑秩序 B",
        "en": "Order of Logic B",
        "albumId": "time-sync",
        "album": "时光同频器",
        "file": "时光同频器_06_逻辑秩序B_Order_of_Logic.mp3",
        "assetName": "time-sync_06.mp3",
        "builtin": false,
        "bytes": 1508145
      },
      {
        "id": "time-sync-07",
        "num": "07",
        "name": "光阴逗号 A",
        "en": "A Comma in Time A",
        "albumId": "time-sync",
        "album": "时光同频器",
        "file": "时光同频器_07_光阴逗号A_A_Comma_in_Time.mp3",
        "assetName": "time-sync_07.mp3",
        "builtin": false,
        "bytes": 1699988
      },
      {
        "id": "time-sync-08",
        "num": "08",
        "name": "光阴逗号 B",
        "en": "A Comma in Time B",
        "albumId": "time-sync",
        "album": "时光同频器",
        "file": "时光同频器_08_光阴逗号B_A_Comma_in_Time.mp3",
        "assetName": "time-sync_08.mp3",
        "builtin": false,
        "bytes": 1500308
      },
      {
        "id": "time-sync-09",
        "num": "09",
        "name": "气泡白日梦 A",
        "en": "Carbonated Daydream A",
        "albumId": "time-sync",
        "album": "时光同频器",
        "file": "时光同频器_09_气泡白日梦A_Carbonated_Daydream.mp3",
        "assetName": "time-sync_09.mp3",
        "builtin": false,
        "bytes": 1713467
      },
      {
        "id": "time-sync-10",
        "num": "10",
        "name": "气泡白日梦 B",
        "en": "Carbonated Daydream B",
        "albumId": "time-sync",
        "album": "时光同频器",
        "file": "时光同频器_10_气泡白日梦B_Carbonated_Daydream.mp3",
        "assetName": "time-sync_10.mp3",
        "builtin": false,
        "bytes": 2312507
      },
      {
        "id": "time-sync-11",
        "num": "11",
        "name": "气泡白日梦 C",
        "en": "Carbonated Daydream C",
        "albumId": "time-sync",
        "album": "时光同频器",
        "file": "时光同频器_11_气泡白日梦C_Carbonated_Daydream.mp3",
        "assetName": "time-sync_11.mp3",
        "builtin": false,
        "bytes": 1515355
      },
      {
        "id": "time-sync-12",
        "num": "12",
        "name": "气泡白日梦 D",
        "en": "Carbonated Daydream D",
        "albumId": "time-sync",
        "album": "时光同频器",
        "file": "时光同频器_12_气泡白日梦D_Carbonated_Daydream.mp3",
        "assetName": "time-sync_12.mp3",
        "builtin": false,
        "bytes": 1588706
      },
      {
        "id": "time-sync-13",
        "num": "13",
        "name": "深潜赫兹 A",
        "en": "Immersion Hertz A",
        "albumId": "time-sync",
        "album": "时光同频器",
        "file": "时光同频器_13_深潜赫兹A_Immersion_Hertz.mp3",
        "assetName": "time-sync_13.mp3",
        "builtin": false,
        "bytes": 5753147
      },
      {
        "id": "time-sync-14",
        "num": "14",
        "name": "深潜赫兹 B",
        "en": "Immersion Hertz B",
        "albumId": "time-sync",
        "album": "时光同频器",
        "file": "时光同频器_14_深潜赫兹B_Immersion_Hertz.mp3",
        "assetName": "time-sync_14.mp3",
        "builtin": false,
        "bytes": 2321598
      },
      {
        "id": "time-sync-15",
        "num": "15",
        "name": "橘色终章 A",
        "en": "Orange Epilogue A",
        "albumId": "time-sync",
        "album": "时光同频器",
        "file": "时光同频器_15_橘色终章A_Orange_Epilogue.mp3",
        "assetName": "time-sync_15.mp3",
        "builtin": false,
        "bytes": 1709706
      },
      {
        "id": "time-sync-16",
        "num": "16",
        "name": "橘色终章 B",
        "en": "Orange Epilogue B",
        "albumId": "time-sync",
        "album": "时光同频器",
        "file": "时光同频器_16_橘色终章B_Orange_Epilogue.mp3",
        "assetName": "time-sync_16.mp3",
        "builtin": false,
        "bytes": 1713467
      },
      {
        "id": "time-sync-17",
        "num": "17",
        "name": "独处美学 A",
        "en": "Aesthetics of Solitude A",
        "albumId": "time-sync",
        "album": "时光同频器",
        "file": "时光同频器_17_独处美学A_Aesthetics_of_Solitude.mp3",
        "assetName": "time-sync_17.mp3",
        "builtin": false,
        "bytes": 1605320
      },
      {
        "id": "time-sync-18",
        "num": "18",
        "name": "独处美学 B",
        "en": "Aesthetics of Solitude B",
        "albumId": "time-sync",
        "album": "时光同频器",
        "file": "时光同频器_18_独处美学B_Aesthetics_of_Solitude.mp3",
        "assetName": "time-sync_18.mp3",
        "builtin": false,
        "bytes": 1596230
      },
      {
        "id": "time-sync-19",
        "num": "19",
        "name": "夜色独白 A",
        "en": "Nocturnal Monologue A",
        "albumId": "time-sync",
        "album": "时光同频器",
        "file": "时光同频器_19_夜色独白A_Nocturnal_Monologue.mp3",
        "assetName": "time-sync_19.mp3",
        "builtin": false,
        "bytes": 1676478
      },
      {
        "id": "time-sync-20",
        "num": "20",
        "name": "夜色独白 B",
        "en": "Nocturnal Monologue B",
        "albumId": "time-sync",
        "album": "时光同频器",
        "file": "时光同频器_20_夜色独白B_Nocturnal_Monologue.mp3",
        "assetName": "time-sync_20.mp3",
        "builtin": false,
        "bytes": 1380249
      },
      {
        "id": "time-sync-21",
        "num": "21",
        "name": "意识边缘 A",
        "en": "Edge of Consciousness A",
        "albumId": "time-sync",
        "album": "时光同频器",
        "file": "时光同频器_21_意识边缘A_Edge_of_Consciousness.mp3",
        "assetName": "time-sync_21.mp3",
        "builtin": false,
        "bytes": 1728200
      },
      {
        "id": "time-sync-22",
        "num": "22",
        "name": "意识边缘 B",
        "en": "Edge of Consciousness B",
        "albumId": "time-sync",
        "album": "时光同频器",
        "file": "时光同频器_22_意识边缘B_Edge_of_Consciousness.mp3",
        "assetName": "time-sync_22.mp3",
        "builtin": false,
        "bytes": 1968004
      },
      {
        "id": "time-sync-23",
        "num": "23",
        "name": "无限假日 A",
        "en": "After the Pause A",
        "albumId": "time-sync",
        "album": "时光同频器",
        "file": "时光同频器_23_无限假日A_After_the_Pause.mp3",
        "assetName": "time-sync_23.mp3",
        "builtin": false,
        "bytes": 1528207
      },
      {
        "id": "time-sync-24",
        "num": "24",
        "name": "无限假日 B",
        "en": "After the Pause B",
        "albumId": "time-sync",
        "album": "时光同频器",
        "file": "时光同频器_24_无限假日B_After_the_Pause.mp3",
        "assetName": "time-sync_24.mp3",
        "builtin": false,
        "bytes": 1920357
      }
    ],
    "totalBytes": 45137502
  }
]

const activeJobs = new Map()

function jobKey(dataDir, albumId) {
  return `${String(dataDir || '')}::${String(albumId || '')}`
}

export function getFocusAlbumBaseUrl(override) {
  const raw = String(override || process.env.JPHONE_FOCUS_ALBUM_BASE_URL || DEFAULT_FOCUS_ALBUM_BASE_URL).trim()
  return raw.replace(/\/+$/, '')
}

export function getFocusMusicRoot(dataDir) {
  return join(dataDir, 'focus-music')
}

export function getTrackAudioUrl(track) {
  if (track.builtin) {
    return `/jphone/media/focus/music/${encodeURIComponent(track.file)}`
  }
  return `/jphone/media/focus/music/${encodeURIComponent(track.albumId)}/${encodeURIComponent(track.assetName)}`
}

export function findAlbumById(albumId) {
  return FOCUS_ALBUMS_CATALOG.find((a) => a.id === albumId) || null
}

export function resolveDownloadedAlbumTrackPath(dataDir, albumId, assetName) {
  if (!/^[a-z0-9-]+$/.test(String(albumId || ''))) return null
  if (!/^[a-z0-9_-]+\.mp3$/i.test(String(assetName || ''))) return null
  return join(getFocusMusicRoot(dataDir), albumId, assetName)
}

async function fileReady(path) {
  try {
    const st = await stat(path)
    return st.isFile() && st.size > 1024
  } catch {
    return false
  }
}

export async function listAlbumsWithStatus({ dataDir, pluginAssetsDir }) {
  const albums = []
  for (const album of FOCUS_ALBUMS_CATALOG) {
    const k = jobKey(dataDir, album.id)
    const job = activeJobs.get(k) || null
    const tracks = []
    let availableTracks = 0
    let downloadedTracks = 0
    let builtinTracks = 0
    let totalBytes = 0
    let downloadedBytes = 0
    let remainingBytes = 0

    for (const t of album.tracks) {
      totalBytes += Number(t.bytes || 0)
      let available = false
      let downloaded = false
      if (t.builtin) {
        builtinTracks += 1
        available = pluginAssetsDir
          ? await fileReady(join(pluginAssetsDir, 'focus', 'music', t.file))
          : true
        if (!available) {
          // fallback if user downloaded it into dataDir too
          const dlPath = resolveDownloadedAlbumTrackPath(dataDir, album.id, t.assetName)
          if (dlPath && (await fileReady(dlPath))) {
            available = true
            downloaded = true
          }
        }
      } else {
        const dlPath = resolveDownloadedAlbumTrackPath(dataDir, album.id, t.assetName)
        if (dlPath && (await fileReady(dlPath))) {
          available = true
          downloaded = true
          downloadedTracks += 1
          downloadedBytes += Number(t.bytes || 0)
        } else {
          remainingBytes += Number(t.bytes || 0)
        }
      }
      if (available) availableTracks += 1
      tracks.push({
        id: t.id,
        num: t.num,
        name: t.name,
        en: t.en,
        albumId: album.id,
        album: album.name,
        cover: album.cover,
        assetName: t.assetName,
        builtin: !!t.builtin,
        bytes: Number(t.bytes || 0),
        available,
        downloaded,
        url: getTrackAudioUrl(t),
      })
    }

    const totalTracks = album.tracks.length
    const complete = availableTracks >= totalTracks
    albums.push({
      id: album.id,
      name: album.name,
      en: album.en,
      desc: album.desc,
      cover: album.cover,
      totalTracks,
      availableTracks,
      downloadedTracks,
      builtinTracks,
      totalBytes,
      downloadedBytes,
      remainingBytes,
      complete,
      download: job
        ? {
            downloading: !!job.downloading,
            done: job.done,
            total: job.total,
            currentTrack: job.currentTrack || '',
            error: job.error || '',
            failedCount: job.failedCount || 0,
          }
        : {
            downloading: false,
            done: complete ? totalTracks - builtinTracks : downloadedTracks,
            total: totalTracks - builtinTracks,
            currentTrack: '',
            error: '',
            failedCount: 0,
          },
      tracks,
    })
  }
  return {
    ok: true,
    releaseBaseUrl: getFocusAlbumBaseUrl(),
    albums,
  }
}

let cachedGhToken = null
let cachedReleaseAssets = null

async function getGithubToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN.trim()
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN.trim()
  if (cachedGhToken !== null) return cachedGhToken
  try {
    const { stdout } = await execFileAsync('gh', ['auth', 'token'], { timeout: 3000 })
    cachedGhToken = String(stdout || '').trim()
  } catch {
    cachedGhToken = ''
  }
  return cachedGhToken
}

async function resolvePrivateGithubAssetUrl(releaseUrl, signal) {
  const m = /^https:\/\/github\.com\/([^/]+\/[^/]+)\/releases\/download\/([^/]+)\/(.+)$/.exec(releaseUrl)
  if (!m) return null
  const token = await getGithubToken()
  if (!token) return null
  const [, repo, tag, rawName] = m
  const name = decodeURIComponent(rawName)
  const cacheKey = `${repo}@${tag}`
  if (!cachedReleaseAssets || cachedReleaseAssets.key !== cacheKey) {
    const relRes = await fetch(`https://api.github.com/repos/${repo}/releases/tags/${encodeURIComponent(tag)}`, {
      signal,
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/vnd.github+json',
        'user-agent': 'JPhone-Focus-Downloader/1.0',
      },
    })
    if (!relRes.ok) return null
    const relJson = await relRes.json()
    const map = new Map()
    for (const a of relJson.assets || []) {
      if (a && a.name && a.url) map.set(a.name, a.url)
    }
    cachedReleaseAssets = { key: cacheKey, map }
  }
  const apiAssetUrl = cachedReleaseAssets.map.get(name)
  return apiAssetUrl ? { apiAssetUrl, token } : null
}

async function downloadSingleTrack(url, targetPath, signal) {
  let res = await fetch(url, {
    method: 'GET',
    redirect: 'follow',
    signal,
    headers: { 'user-agent': 'JPhone-Focus-Downloader/1.0' },
  })
  if (res.status === 404 && url.startsWith('https://github.com/')) {
    const priv = await resolvePrivateGithubAssetUrl(url, signal)
    if (priv) {
      res = await fetch(priv.apiAssetUrl, {
        method: 'GET',
        redirect: 'follow',
        signal,
        headers: {
          authorization: `Bearer ${priv.token}`,
          accept: 'application/octet-stream',
          'user-agent': 'JPhone-Focus-Downloader/1.0',
        },
      })
    }
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }
  const ab = await res.arrayBuffer()
  const buf = Buffer.from(ab)
  if (buf.length <= 1024) {
    throw new Error('empty_audio_payload')
  }
  const tmpPath = `${targetPath}.tmp-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
  await writeFile(tmpPath, buf)
  await rename(tmpPath, targetPath)
  return buf.length
}

export async function startAlbumDownload(albumId, { dataDir, baseUrl, onProgress, concurrency = 3 } = {}) {
  const album = findAlbumById(albumId)
  if (!album) {
    return { ok: false, error: 'album_not_found' }
  }
  const k = jobKey(dataDir, album.id)
  const existing = activeJobs.get(k)
  if (existing && existing.downloading) {
    return {
      ok: true,
      alreadyRunning: true,
      albumId: album.id,
      download: {
        downloading: true,
        done: existing.done,
        total: existing.total,
        currentTrack: existing.currentTrack,
        error: existing.error,
        failedCount: existing.failedCount,
      },
    }
  }

  const albumDir = join(getFocusMusicRoot(dataDir), album.id)
  await mkdir(albumDir, { recursive: true })

  const downloadable = album.tracks.filter((t) => !t.builtin)
  const pending = []
  let alreadyDone = 0
  for (const t of downloadable) {
    const dest = resolveDownloadedAlbumTrackPath(dataDir, album.id, t.assetName)
    if (dest && (await fileReady(dest))) {
      alreadyDone += 1
    } else {
      pending.push(t)
    }
  }

  if (pending.length === 0) {
    const doneState = {
      downloading: false,
      done: downloadable.length,
      total: downloadable.length,
      currentTrack: '',
      error: '',
      failedCount: 0,
    }
    activeJobs.delete(k)
    return { ok: true, alreadyComplete: true, albumId: album.id, download: doneState }
  }

  const ac = new AbortController()
  const job = {
    downloading: true,
    done: alreadyDone,
    total: downloadable.length,
    currentTrack: pending[0]?.name || '',
    error: '',
    failedCount: 0,
    cancelled: false,
    controller: ac,
  }
  activeJobs.set(k, job)

  const effectiveBase = getFocusAlbumBaseUrl(baseUrl)
  const notify = () => {
    try {
      onProgress?.({
        albumId: album.id,
        downloading: job.downloading,
        done: job.done,
        total: job.total,
        currentTrack: job.currentTrack,
        error: job.error,
        failedCount: job.failedCount,
      })
    } catch {}
  }
  notify()

  let cursor = 0
  const workerCount = Math.max(1, Math.min(Number(concurrency) || 3, pending.length))

  const runWorker = async () => {
    while (!job.cancelled) {
      const idx = cursor++
      if (idx >= pending.length) break
      const track = pending[idx]
      const dest = resolveDownloadedAlbumTrackPath(dataDir, album.id, track.assetName)
      if (!dest) continue
      job.currentTrack = track.name
      notify()
      const url = `${effectiveBase}/${encodeURIComponent(track.assetName)}`
      let ok = false
      let lastErr = ''
      for (let attempt = 0; attempt < 2 && !job.cancelled; attempt++) {
        try {
          await downloadSingleTrack(url, dest, ac.signal)
          ok = true
          break
        } catch (err) {
          lastErr = String(err?.message || err)
          if (job.cancelled) break
        }
      }
      if (job.cancelled) break
      if (ok) {
        job.done += 1
      } else {
        job.failedCount += 1
        job.error = `${track.name}: ${lastErr}`
      }
      notify()
    }
  }

  const completionPromise = Promise.all(Array.from({ length: workerCount }, () => runWorker()))
    .finally(() => {
      job.downloading = false
      if (job.cancelled) {
        activeJobs.delete(k)
      } else if (job.failedCount === 0) {
        job.currentTrack = ''
        job.error = ''
        activeJobs.delete(k)
      }
      notify()
    })

  return {
    ok: true,
    started: true,
    albumId: album.id,
    download: {
      downloading: true,
      done: job.done,
      total: job.total,
      currentTrack: job.currentTrack,
      error: job.error,
      failedCount: job.failedCount,
    },
    _donePromise: completionPromise,
  }
}

export async function deleteDownloadedAlbum(albumId, { dataDir }) {
  const album = findAlbumById(albumId)
  if (!album) {
    return { ok: false, error: 'album_not_found' }
  }
  const k = jobKey(dataDir, album.id)
  const job = activeJobs.get(k)
  if (job) {
    job.cancelled = true
    try { job.controller?.abort() } catch {}
    activeJobs.delete(k)
  }
  const albumDir = join(getFocusMusicRoot(dataDir), album.id)
  try {
    await rm(albumDir, { recursive: true, force: true })
  } catch {}
  return { ok: true, albumId: album.id, deleted: true }
}
