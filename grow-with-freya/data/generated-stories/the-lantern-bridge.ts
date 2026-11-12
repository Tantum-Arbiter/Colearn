// Phase 12 dev bundle of an ai-tools book, built from
// contract-fixtures/stories/the-lantern-bridge.json with the ai-tools render of its pages and covers.
// Replace with the export-for-app output when that lands.
import { Story } from '@/types/story';

export const theLanternBridge: Story = {
      "id": "the-lantern-bridge",
      "title": "The Lantern Bridge",
      "localizedTitle": {
        "en": "The Lantern Bridge",
      },
      "category": "learning",
      "coverImage": require('../../assets/stories/the-lantern-bridge/cover/thumbnail.webp'),
      "isAvailable": true,
      "ageRange": "2-4",
      "pageCount": 15,
      "displayFit": "cover",
      "description": "Nori the dormouse wants his woodland bridge to look perfect for his neighbour's visit. But when the wind blows his lanterns out, he learns that walking together matters much more than a fancy display.",
      "localizedDescription": {
        "en": "Nori the dormouse wants his woodland bridge to look perfect for his neighbour's visit. But when the wind blows his lanterns out, he learns that walking together matters much more than a fancy display.",
      },
      "isPremium": true,
      "isFree": false,
      "author": "Early Roots",
      "tags": [
        "counting",
        "interactive",
        "friendship",
        "animals",
      ],
      "pages": [
        {
          "id": "the-lantern-bridge-cover",
          "pageNumber": 0,
          "type": "cover",
          "text": "The Lantern Bridge",
          "backgroundImage": require('../../assets/stories/the-lantern-bridge/cover/cover.webp'),
        },
        {
          "id": "the-lantern-bridge-1",
          "pageNumber": 1,
          "type": "story",
          "backgroundImage": require('../../assets/stories/the-lantern-bridge/page-1/background.webp'),
          "text": "Nori the dormouse looked out at the park.\nHis best friend was coming to tea in the dark!\n\"A glowing light, a little spark,\nTo guide a friend across the dark!\"",
          "interactionType": "none",
          "localizedText": {
            "1-2": {
              "en": "Nori looks out at the park.\nA little spark across the dark!",
            },
            "2-4": {
              "en": "Nori the dormouse looked out at the park.\nHis best friend was coming to tea in the dark!\n\"A glowing light, a little spark,\nTo guide a friend across the dark!\"",
            },
            "4-6": {
              "en": "Nori the dormouse peeked out through his window at the shadowy park. His very best friend was coming to tea in the dark! He wanted to make everything bright. \"A glowing light, a little spark, to guide a friend across the dark!\"",
            },
          },
        },
        {
          "id": "the-lantern-bridge-2",
          "pageNumber": 2,
          "type": "story",
          "backgroundImage": require('../../assets/stories/the-lantern-bridge/page-2/background.webp'),
          "text": "He carried his lanterns of yellow and red,\nAnd piled them up high on the porch by his shed.\nToby the mole would be here for his tea!\nAnd Nori was busy as busy could be.",
          "interactionType": "none",
          "localizedText": {
            "1-2": {
              "en": "Red and yellow lanterns glow.\nLook at Nori wobbling so!",
            },
            "2-4": {
              "en": "He carried his lanterns of yellow and red,\nAnd piled them up high on the porch by his shed.\nToby the mole would be here for his tea!\nAnd Nori was busy as busy could be.",
            },
            "4-6": {
              "en": "He carefully carried his lanterns of yellow and shiny bright red, piling them up high on the wooden porch by his shed. Toby the mole would be here soon for his tea, and Nori was busy as busy could be!",
            },
          },
        },
        {
          "id": "the-lantern-bridge-3",
          "pageNumber": 3,
          "type": "story",
          "backgroundImage": require('../../assets/stories/the-lantern-bridge/page-3/background.webp'),
          "text": "*Whoosh!* went the wind with a terrible blow.\nIt knocked down the lanterns and ruined the glow.\nThe yellow ones rolled and the red ones went *pop*!\nNori ran after them, making them stop.",
          "interactionType": "none",
          "localizedText": {
            "1-2": {
              "en": "*Whoosh* goes the windy blow!\nThe lanterns roll and lose their glow.",
            },
            "2-4": {
              "en": "*Whoosh!* went the wind with a terrible blow.\nIt knocked down the lanterns and ruined the glow.\nThe yellow ones rolled and the red ones went *pop*!\nNori ran after them, making them stop.",
            },
            "4-6": {
              "en": "Suddenly, *whoosh!* went the autumn wind with a terrible blow. It knocked down his pile and completely ruined the glow. The yellow ones rolled away and the red ones went *pop!* Nori ran fast down the path, trying to make them stop.",
            },
          },
        },
        {
          "id": "the-lantern-bridge-4",
          "pageNumber": 4,
          "type": "story",
          "backgroundImage": require('../../assets/stories/the-lantern-bridge/page-4/background.webp'),
          "text": "He saved just two lanterns that flickered and glowed.\nNori looked hard at the patches of light.\nHe matched up the dots for the start of the road.\n\"I'll carry these two, and I'll make it look right!\"",
          "interactionType": "learning_challenge",
          "localizedText": {
            "1-2": {
              "en": "Nori saves two little lights.\nHe will make the bridge look right.",
            },
            "2-4": {
              "en": "He saved just two lanterns that flickered and glowed.\nNori looked hard at the patches of light.\nHe matched up the dots for the start of the road.\n\"I'll carry these two, and I'll make it look right!\"",
            },
            "4-6": {
              "en": "He rescued just two little lanterns that flickered and glowed, then looked very hard at the dark patches on the road. He matched up the dots to make everything right. \"I'll carry these two, and I'll share my bright light!\"",
            },
          },
          "learningChallenge": {
            "challengeId": "the-lantern-bridge-4-challenge",
            "briefInteractionId": "GWF-002-I01",
            "mechanicId": "M08",
            "family": "tap_scene",
            "adapter": "small_set_choice",
            "assessmentMode": "guided_observable",
            "audioDependent": false,
            "domain": "maths",
            "skillId": "",
            "copy": {
              "title": {
                "2-4": {
                  "en": "Match the lights",
                },
              },
              "setupLine": {
                "2-4": {
                  "en": "Nori looked hard at the patches of light.",
                },
              },
              "instruction": {
                "2-4": {
                  "en": "Nori has two lanterns. Tap the dots that match.",
                },
              },
              "successLine": {
                "2-4": {
                  "en": "\"I'll carry these two!\" Nori said with a smile.",
                },
              },
              "onSkip": {
                "2-4": {
                  "en": "Nori quickly found the matching dot group on his map.",
                },
              },
              "parentPrompt": {
                "2-4": {
                  "en": "Can you see anything else here that comes in twos?",
                },
              },
              "hints": [
                {
                  "2-4": {
                    "en": "Look closely at the two glowing lanterns.",
                  },
                },
                {
                  "2-4": {
                    "en": "Now find the group of exactly two dots and tap it.",
                  },
                },
              ],
            },
            "items": [
              {
                "id": "two-dots",
                "label": {
                  "en": "two dots",
                },
                "hotspot": {
                  "position": {
                    "x": 0.335,
                    "y": 0.69,
                  },
                  "size": {
                    "width": 0.2,
                    "height": 0.155,
                  },
                },
                "outcome": {
                  "successLine": {
                    "2-4": {
                      "en": "Two lanterns, two dots! They match.",
                    },
                  },
                },
              },
              {
                "id": "three-dots",
                "label": {
                  "en": "three dots",
                },
                "hotspot": {
                  "position": {
                    "x": 0.54,
                    "y": 0.705,
                  },
                  "size": {
                    "width": 0.17,
                    "height": 0.155,
                  },
                },
              },
            ],
            "target": "two-dots",
            "byAge": {
              "1-2": {
                "gesture": "tap",
                "items": [
                  "two-dots",
                  "three-dots",
                ],
              },
              "2-4": {
                "gesture": "tap",
                "items": [
                  "two-dots",
                  "three-dots",
                ],
              },
              "4+": {
                "gesture": "tap",
                "items": [
                  "two-dots",
                  "three-dots",
                ],
              },
            },
            "allowSkip": true,
            "isMusicGate": false,
          },
        },
        {
          "id": "the-lantern-bridge-5",
          "pageNumber": 5,
          "type": "story",
          "backgroundImage": require('../../assets/stories/the-lantern-bridge/page-5/background.webp'),
          "text": "He set the two lights on the old wooden floor.\nThe start of the bridge wasn't dark anymore!\n\"A glowing light, a little spark,\nTo guide a friend across the dark!\"",
          "interactionType": "none",
          "localizedText": {
            "1-2": {
              "en": "Two lights shine upon the floor.\nIt is not dark anymore!",
            },
            "2-4": {
              "en": "He set the two lights on the old wooden floor.\nThe start of the bridge wasn't dark anymore!\n\"A glowing light, a little spark,\nTo guide a friend across the dark!\"",
            },
            "4-6": {
              "en": "He proudly set the two lights on the old wooden floor. The start of the bridge wasn't scary or dark anymore! He smiled as he sang out his favourite remark: \"A glowing light, a little spark, to guide a friend across the dark!\"",
            },
          },
        },
        {
          "id": "the-lantern-bridge-6",
          "pageNumber": 6,
          "type": "story",
          "backgroundImage": require('../../assets/stories/the-lantern-bridge/page-6/background.webp'),
          "text": "Nori walked on to the middle, but oh!\nThe rest of the bridge had no welcoming glow.\nHe shook an old tin with a clatter and clink,\n\"He won't see my bunting at all, I don't think!\"",
          "interactionType": "none",
          "localizedText": {
            "1-2": {
              "en": "The middle is dark without a clink.\nToby will not see, I think.",
            },
            "2-4": {
              "en": "Nori walked on to the middle, but oh!\nThe rest of the bridge had no welcoming glow.\nHe shook an old tin with a clatter and clink,\n\"He won't see my bunting at all, I don't think!\"",
            },
            "4-6": {
              "en": "Nori walked on to the middle of the bridge, but oh! The rest of the wooden path had no welcoming glow. He shook an old tin with a clatter and clink. \"He won't see my beautiful bunting at all, I don't think!\"",
            },
          },
        },
        {
          "id": "the-lantern-bridge-7",
          "pageNumber": 7,
          "type": "story",
          "backgroundImage": require('../../assets/stories/the-lantern-bridge/page-7/background.webp'),
          "text": "He looked at the shadows and scratched at his nose.\n\"I need a few more for the bridge, I suppose.\nIf Toby can't see all the flags I have made,\nHe might feel afraid in the gloomy old shade.\"",
          "interactionType": "none",
          "localizedText": {
            "1-2": {
              "en": "Nori looks down the gloomy shade.\nHe wants to show the flags he made.",
            },
            "2-4": {
              "en": "He looked at the shadows and scratched at his nose.\n\"I need a few more for the bridge, I suppose.\nIf Toby can't see all the flags I have made,\nHe might feel afraid in the gloomy old shade.\"",
            },
            "4-6": {
              "en": "He looked at the deep shadows and scratched at his little nose. \"I need a few more for the bridge, I suppose. If Toby can't see all the lovely flags I have made, he might feel afraid in this gloomy old shade.\"",
            },
          },
        },
        {
          "id": "the-lantern-bridge-8",
          "pageNumber": 8,
          "type": "story",
          "backgroundImage": require('../../assets/stories/the-lantern-bridge/page-8/background.webp'),
          "text": "\"One, two, and three,\" Nori counted the spots.\n\"I need to put lights in these three empty pots.\"\nHe tapped on the hooks where the lanterns should go,\nTo plan out a lovely and welcoming glow.",
          "interactionType": "learning_challenge",
          "localizedText": {
            "1-2": {
              "en": "One, two, three empty spots.\nNori needs lights in these pots!",
            },
            "2-4": {
              "en": "\"One, two, and three,\" Nori counted the spots.\n\"I need to put lights in these three empty pots.\"\nHe tapped on the hooks where the lanterns should go,\nTo plan out a lovely and welcoming glow.",
            },
            "4-6": {
              "en": "\"One, two, and three,\" Nori counted out the empty spots. \"I need to put lights in these three little pots.\" He tapped on the iron hooks where the lanterns should go, planning out a lovely and welcoming glow for his friend.",
            },
          },
          "learningChallenge": {
            "challengeId": "the-lantern-bridge-8-challenge",
            "briefInteractionId": "GWF-002-I02",
            "mechanicId": "M01",
            "family": "tap_scene",
            "adapter": "multi_tap_count",
            "assessmentMode": "guided_observable",
            "audioDependent": false,
            "domain": "maths",
            "skillId": "",
            "copy": {
              "title": {
                "2-4": {
                  "en": "Count the empty hooks",
                },
              },
              "setupLine": {
                "2-4": {
                  "en": "\"One, two, and three,\" Nori counted the spots.",
                },
              },
              "instruction": {
                "2-4": {
                  "en": "Tap each empty hook to count them with Nori.",
                },
              },
              "successLine": {
                "2-4": {
                  "en": "\"Three spots to fill!\" said Nori happily.",
                },
              },
              "onSkip": {
                "2-4": {
                  "en": "Nori tapped the three empty hooks himself to make a plan.",
                },
              },
              "parentPrompt": {
                "2-4": {
                  "en": "How many hooks did we find altogether?",
                },
              },
              "hints": [
                {
                  "2-4": {
                    "en": "Look for the empty hooks hanging on the wood.",
                  },
                },
                {
                  "2-4": {
                    "en": "Tap each empty hook as we count it.",
                  },
                },
              ],
            },
            "items": [
              {
                "id": "first-hook",
                "label": {
                  "en": "first empty hook",
                },
                "hotspot": {
                  "position": {
                    "x": 0.425,
                    "y": 0.41,
                  },
                  "size": {
                    "width": 0.055,
                    "height": 0.13,
                  },
                },
              },
              {
                "id": "second-hook",
                "label": {
                  "en": "second empty hook",
                },
                "hotspot": {
                  "position": {
                    "x": 0.528,
                    "y": 0.465,
                  },
                  "size": {
                    "width": 0.053,
                    "height": 0.125,
                  },
                },
              },
              {
                "id": "third-hook",
                "label": {
                  "en": "third empty hook",
                },
                "hotspot": {
                  "position": {
                    "x": 0.665,
                    "y": 0.54,
                  },
                  "size": {
                    "width": 0.055,
                    "height": 0.125,
                  },
                },
              },
            ],
            "target": "",
            "byAge": {
              "1-2": {
                "gesture": "tap",
                "items": [
                  "first-hook",
                  "second-hook",
                  "third-hook",
                ],
              },
              "2-4": {
                "gesture": "tap",
                "items": [
                  "first-hook",
                  "second-hook",
                  "third-hook",
                ],
              },
              "4+": {
                "gesture": "tap",
                "items": [
                  "first-hook",
                  "second-hook",
                  "third-hook",
                ],
              },
            },
            "allowSkip": true,
            "isMusicGate": false,
          },
        },
        {
          "id": "the-lantern-bridge-9",
          "pageNumber": 9,
          "type": "story",
          "backgroundImage": require('../../assets/stories/the-lantern-bridge/page-9/background.webp'),
          "text": "He searched in his bag for a candle or two,\nAnd pulled out a shiny new lantern of blue.\nHe reached up on tiptoes to hang it up high,\nBeneath the dark clouds in the wintry night sky.",
          "interactionType": "none",
          "localizedText": {
            "1-2": {
              "en": "A blue lantern up so high,\nunderneath the wintry sky.",
            },
            "2-4": {
              "en": "He searched in his bag for a candle or two,\nAnd pulled out a shiny new lantern of blue.\nHe reached up on tiptoes to hang it up high,\nBeneath the dark clouds in the wintry night sky.",
            },
            "4-6": {
              "en": "He searched in his trusty bag for a candle or two, and pulled out a shiny new lantern of brilliant blue. He reached up on tiptoes to hang it up high, right beneath the dark clouds in the wintry night sky.",
            },
          },
        },
        {
          "id": "the-lantern-bridge-10",
          "pageNumber": 10,
          "type": "story",
          "backgroundImage": require('../../assets/stories/the-lantern-bridge/page-10/background.webp'),
          "text": "But *wobble* and *bump!* went the light on the wood.\nIt rolled down the planks and it stopped in the mud!\n\"Oh bother,\" said Nori, \"it's broken and black!\nThe bridge is too dark, and I have to go back.\"",
          "interactionType": "none",
          "localizedText": {
            "1-2": {
              "en": "*Bump* goes the light in the mud!\nIt is broken with a thud.",
            },
            "2-4": {
              "en": "But *wobble* and *bump!* went the light on the wood.\nIt rolled down the planks and it stopped in the mud!\n\"Oh bother,\" said Nori, \"it's broken and black!\nThe bridge is too dark, and I have to go back.\"",
            },
            "4-6": {
              "en": "But *wobble* and *bump!* went the shiny light on the wood. It rolled down the planks and it stopped right in the mud! \"Oh bother,\" said Nori, \"it's broken and black! The bridge is too dark, and I have to go back.\"",
            },
          },
        },
        {
          "id": "the-lantern-bridge-11",
          "pageNumber": 11,
          "type": "story",
          "backgroundImage": require('../../assets/stories/the-lantern-bridge/page-11/background.webp'),
          "text": "\"Toby is here!\" came a voice from the trees.\nNori said, \"Toby! Come walk with me, please!\"\nHe offered a paw or a lamp for the stroll,\nTo welcome his neighbour, the lovely old mole.",
          "interactionType": "learning_challenge",
          "localizedText": {
            "1-2": {
              "en": "\"Toby is here!\" from the trees.\n\"Come walk with me, please!\"",
            },
            "2-4": {
              "en": "\"Toby is here!\" came a voice from the trees.\nNori said, \"Toby! Come walk with me, please!\"\nHe offered a paw or a lamp for the stroll,\nTo welcome his neighbour, the lovely old mole.",
            },
            "4-6": {
              "en": "\"Toby is here!\" came a friendly voice from the trees. Nori rushed over and said, \"Toby! Come walk with me, please!\" He offered a paw and his one working lamp for the stroll, to welcome his neighbour, the lovely old mole.",
            },
          },
          "learningChallenge": {
            "challengeId": "the-lantern-bridge-11-challenge",
            "briefInteractionId": "GWF-002-I03",
            "mechanicId": "E02",
            "family": "choose",
            "adapter": "support_choice",
            "assessmentMode": "exploratory_multiple_valid",
            "audioDependent": false,
            "domain": "social",
            "skillId": "",
            "copy": {
              "title": {
                "2-4": {
                  "en": "Welcome Toby",
                },
              },
              "setupLine": {
                "2-4": {
                  "en": "He offered a paw or a lamp for the stroll,",
                },
              },
              "instruction": {
                "2-4": {
                  "en": "How could Nori help Toby walk in the dark?",
                },
              },
              "successLine": {
                "2-4": {
                  "en": "Toby smiled a great big smile!",
                },
              },
              "onSkip": {
                "2-4": {
                  "en": "Nori walked right beside his friend to help him along.",
                },
              },
              "parentPrompt": {
                "2-4": {
                  "en": "Why do you think Toby is smiling so much?",
                },
              },
              "hints": [
                {
                  "2-4": {
                    "en": "Look at what Nori is holding out.",
                  },
                },
                {
                  "2-4": {
                    "en": "Tap the paw or the little lamp to help.",
                  },
                },
              ],
            },
            "items": [
              {
                "id": "offer-a-paw",
                "label": {
                  "en": "Offer a paw",
                },
                "image": require('../../assets/stories/the-lantern-bridge/page-11/challenge/offer-a-paw.webp'),
                "outcome": {
                  "successLine": {
                    "2-4": {
                      "en": "When a friend feels unsure, you can help:",
                    },
                  },
                  "tips": [
                    {
                      "2-4": {
                        "en": "Hold their hand gently.",
                      },
                    },
                    {
                      "2-4": {
                        "en": "Walk at their speed.",
                      },
                    },
                    {
                      "2-4": {
                        "en": "Say, “I’m right here.”",
                      },
                    },
                  ],
                },
              },
              {
                "id": "share-the-lamp",
                "label": {
                  "en": "Share the lamp",
                },
                "image": require('../../assets/stories/the-lantern-bridge/page-11/challenge/share-the-lamp.webp'),
                "outcome": {
                  "successLine": {
                    "2-4": {
                      "en": "When it is dark, you can help a friend:",
                    },
                  },
                  "tips": [
                    {
                      "2-4": {
                        "en": "Share your light.",
                      },
                    },
                    {
                      "2-4": {
                        "en": "Walk close beside them.",
                      },
                    },
                    {
                      "2-4": {
                        "en": "Tell them about the steps ahead.",
                      },
                    },
                  ],
                },
              },
            ],
            "target": "",
            "byAge": {
              "1-2": {
                "gesture": "tap",
                "items": [
                  "offer-a-paw",
                  "share-the-lamp",
                ],
              },
              "2-4": {
                "gesture": "tap",
                "items": [
                  "offer-a-paw",
                  "share-the-lamp",
                ],
              },
              "4+": {
                "gesture": "tap",
                "items": [
                  "offer-a-paw",
                  "share-the-lamp",
                ],
              },
            },
            "allowSkip": true,
            "isMusicGate": false,
          },
        },
        {
          "id": "the-lantern-bridge-12",
          "pageNumber": 12,
          "type": "story",
          "backgroundImage": require('../../assets/stories/the-lantern-bridge/page-12/background.webp'),
          "text": "Toby held on and he gave a big smile.\nThey walked by the stream for a wonderful while.\n\"The dark isn't scary,\" said Toby with glee,\n\"Because you are walking right next to me!\"",
          "interactionType": "none",
          "localizedText": {
            "1-2": {
              "en": "Toby holds on with a smile.\nThey walk for a little while.",
            },
            "2-4": {
              "en": "Toby held on and he gave a big smile.\nThey walked by the stream for a wonderful while.\n\"The dark isn't scary,\" said Toby with glee,\n\"Because you are walking right next to me!\"",
            },
            "4-6": {
              "en": "Toby held on tightly and he gave a great big smile. They walked by the bubbling stream for a wonderful while. \"The dark isn't scary,\" said Toby with glee, \"because you are walking right next to me!\"",
            },
          },
        },
        {
          "id": "the-lantern-bridge-13",
          "pageNumber": 13,
          "type": "story",
          "backgroundImage": require('../../assets/stories/the-lantern-bridge/page-13/background.webp'),
          "text": "The bunting was dark and the lanterns were few,\nBut Toby was happy and smiling, it's true.\n\"Your flags are so pretty,\" the little mole said.\nNori just giggled and nodded his head.",
          "interactionType": "none",
          "localizedText": {
            "1-2": {
              "en": "The flags are dark, it is true.\nBut Toby is happy with you!",
            },
            "2-4": {
              "en": "The bunting was dark and the lanterns were few,\nBut Toby was happy and smiling, it's true.\n\"Your flags are so pretty,\" the little mole said.\nNori just giggled and nodded his head.",
            },
            "4-6": {
              "en": "The bunting was dark and the glowing lanterns were few, but Toby was happy and smiling, it's very true. \"Your flags are so pretty,\" the little mole kindly said. Nori just giggled and nodded his small furry head.",
            },
          },
        },
        {
          "id": "the-lantern-bridge-14",
          "pageNumber": 14,
          "type": "story",
          "backgroundImage": require('../../assets/stories/the-lantern-bridge/page-14/background.webp'),
          "text": "Nori felt warm, like a bug in a rug.\nHe gave his good neighbour a wonderful hug.\nThe lanterns were out, but the welcome was grand.\nThey stepped on the mat, walking close, paw-in-hand.",
          "interactionType": "none",
          "localizedText": {
            "1-2": {
              "en": "Nori gives a wonderful hug.\nWarm as a bug in a rug!",
            },
            "2-4": {
              "en": "Nori felt warm, like a bug in a rug.\nHe gave his good neighbour a wonderful hug.\nThe lanterns were out, but the welcome was grand.\nThey stepped on the mat, walking close, paw-in-hand.",
            },
            "4-6": {
              "en": "Nori felt very warm inside, just like a bug in a rug. He gave his good neighbour a wonderful, happy hug. The lanterns were out, but the welcome was truly grand. They stepped on the mat, walking close, paw-in-hand.",
            },
          },
        },
        {
          "id": "the-lantern-bridge-15",
          "pageNumber": 15,
          "type": "story",
          "backgroundImage": require('../../assets/stories/the-lantern-bridge/page-15/background.webp'),
          "text": "They sat at the table for crumpets and tea,\nAs happy as two little neighbours could be.\n\"A glowing light, a little spark,\nTo guide a friend across the dark!\"",
          "interactionType": "none",
          "localizedText": {
            "1-2": {
              "en": "Crumpets and tea in the dark!\nA glowing light, a little spark!",
            },
            "2-4": {
              "en": "They sat at the table for crumpets and tea,\nAs happy as two little neighbours could be.\n\"A glowing light, a little spark,\nTo guide a friend across the dark!\"",
            },
            "4-6": {
              "en": "They sat down at the table for hot crumpets and sweet tea, feeling as happy as two little neighbours could be. They smiled as they said, \"A glowing light, a little spark, to guide a friend across the dark!\"",
            },
          },
        },
      ],
    };
