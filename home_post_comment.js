{
  "design_system": {
    "overview": {
      "style": "Modern Reddit-inspired social platform with clean, card-based design",
      "layout": "Three-column layout: left sidebar navigation, center content feed, right sidebar for recent posts",
      "color_scheme": "Reddit-themed with orange accent (#FF4500), white backgrounds, light grays, and purple highlights",
      "theme": "Reddit-inspired with orange primary color, white cards, and clean typography"
    },
    "colors": {
      "primary": "#FF4500",
      "primary_hover": "#E63E00",
      "primary_light": "#FF6B35",
      "secondary": "#0079D3",
      "background_main": "#DAE0E6",
      "background_card": "#FFFFFF",
      "background_input": "#F6F7F8",
      "background_hover": "#F8F9FA",
      "text_primary": "#1C1C1C",
      "text_secondary": "#7C7C7C",
      "text_tertiary": "#A8A8A8",
      "border": "#EDEFF1",
      "border_light": "#E9ECEF",
      "upvote": "#FF4500",
      "downvote": "#7193FF",
      "verified_badge": "#0079D3",
      "success": "#46D160",
      "purple_accent": "#6366F1"
    },
    "typography": {
      "font_family": "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      "heading_xlarge": {
        "size": "28px",
        "weight": "700",
        "line_height": "1.2"
      },
      "heading_large": {
        "size": "20px",
        "weight": "700",
        "line_height": "1.3"
      },
      "heading_medium": {
        "size": "16px",
        "weight": "600",
        "line_height": "1.4"
      },
      "body_regular": {
        "size": "14px",
        "weight": "400",
        "line_height": "1.6"
      },
      "body_small": {
        "size": "13px",
        "weight": "400",
        "line_height": "1.5"
      },
      "caption": {
        "size": "12px",
        "weight": "400",
        "line_height": "1.4",
        "color": "text_secondary"
      },
      "label": {
        "size": "11px",
        "weight": "500",
        "letter_spacing": "0.2px"
      }
    },
    "spacing": {
      "xs": "4px",
      "sm": "8px",
      "md": "12px",
      "lg": "16px",
      "xl": "20px",
      "xxl": "24px",
      "xxxl": "32px"
    },
    "components": {
      "browser_chrome": {
        "background": "#F6F7F8",
        "height": "44px",
        "elements": {
          "traffic_lights": {
            "colors": ["#FF5F57", "#FFBD2E", "#28CA42"],
            "size": "12px",
            "spacing": "8px"
          },
          "navigation_arrows": {
            "color": "text_tertiary",
            "size": "16px"
          },
          "url_bar": {
            "background": "#FFFFFF",
            "border_radius": "6px",
            "padding": "6px 12px",
            "font_size": "13px"
          }
        }
      },
      "top_navigation": {
        "background": "#FFFFFF",
        "height": "56px",
        "border_bottom": "1px solid border",
        "padding": "0 16px",
        "layout": "Flex row with space between",
        "elements": {
          "logo": {
            "icon_size": "32px",
            "text_size": "20px",
            "font_weight": "700",
            "color": "text_primary"
          },
          "search_bar": {
            "width": "300px",
            "background": "background_input",
            "border": "1px solid border",
            "border_radius": "20px",
            "padding": "8px 16px",
            "placeholder": "Search slothit",
            "focus_border": "1px solid primary"
          },
          "action_buttons": {
            "create_button": {
              "background": "purple_accent",
              "color": "#FFFFFF",
              "border_radius": "20px",
              "padding": "8px 16px",
              "font_weight": "600",
              "icon": "Plus icon"
            },
            "icon_buttons": [
              "Shuffle/random",
              "Messages",
              "Notifications",
              "User avatar"
            ],
            "icon_button_style": {
              "size": "36px",
              "border_radius": "50%",
              "hover_background": "background_hover"
            }
          }
        }
      },
      "left_sidebar": {
        "width": "280px",
        "background": "#FFFFFF",
        "padding": "16px 0",
        "border_right": "1px solid border",
        "sections": [
          {
            "type": "primary_navigation",
            "items": [
              {
                "label": "Home",
                "icon": "house",
                "active": true
              },
              {
                "label": "Popular",
                "icon": "trending_up"
              },
              {
                "label": "All",
                "icon": "grid"
              }
            ],
            "item_style": {
              "padding": "10px 16px",
              "margin": "2px 8px",
              "border_radius": "8px",
              "font_size": "14px",
              "font_weight": "500",
              "hover_background": "background_hover",
              "active_background": "background_hover",
              "icon_size": "20px",
              "icon_margin_right": "12px"
            }
          },
          {
            "type": "section_header",
            "title": "Moderation",
            "collapsible": true,
            "style": {
              "padding": "16px 16px 8px",
              "font_size": "12px",
              "font_weight": "600",
              "color": "text_secondary",
              "text_transform": "none"
            }
          },
          {
            "type": "moderation_items",
            "items": [
              "Mod Mail",
              "Mod Queue",
              "s/Mod"
            ],
            "icon_types": ["envelope", "help_circle", "shield"],
            "star_icon_position": "right for favorites"
          },
          {
            "type": "section_header",
            "title": "Recent",
            "collapsible": true
          },
          {
            "type": "subreddit_list",
            "items": [
              "s/swordantonline",
              "s/computerscience",
              "s/linuxmasterrace",
              "s/kidsarestupid",
              "s/interiordesign",
              "s/singularity",
              "s/kidsarestupid"
            ],
            "icon_style": {
              "size": "20px",
              "margin_right": "12px",
              "colors": ["purple_accent", "blue", "orange", "green", "pink"]
            }
          }
        ]
      },
      "post_card": {
        "background": "#FFFFFF",
        "border_radius": "12px",
        "margin_bottom": "16px",
        "padding": "16px",
        "border": "1px solid border",
        "hover_border": "1px solid border_light",
        "layout": "Vertical stack",
        "elements": {
          "header": {
            "layout": "Flex row with space between",
            "left_section": {
              "avatar": {
                "size": "32px",
                "border_radius": "50%",
                "margin_right": "8px"
              },
              "username": {
                "font_weight": "600",
                "font_size": "14px",
                "color": "text_primary",
                "prefix": "s/"
              },
              "timestamp": {
                "font_size": "12px",
                "color": "text_secondary",
                "margin_left": "8px"
              }
            },
            "right_section": {
              "follow_button": {
                "background": "purple_accent",
                "color": "#FFFFFF",
                "border_radius": "20px",
                "padding": "6px 16px",
                "font_size": "13px",
                "font_weight": "600",
                "icon": "Plus icon"
              },
              "menu_button": {
                "size": "32px",
                "icon": "three_dots"
              }
            }
          },
          "content": {
            "title": {
              "font_size": "16px",
              "font_weight": "700",
              "line_height": "1.4",
              "margin_top": "12px",
              "margin_bottom": "8px",
              "color": "text_primary"
            },
            "body": {
              "font_size": "14px",
              "line_height": "1.6",
              "color": "text_primary",
              "margin_bottom": "12px"
            },
            "link_preview": {
              "font_size": "12px",
              "color": "secondary",
              "text_decoration": "none",
              "hover_underline": true
            },
            "image": {
              "max_width": "100%",
              "border_radius": "8px",
              "margin_top": "12px",
              "aspect_ratio": "maintain"
            }
          },
          "footer": {
            "layout": "Flex row with gap",
            "margin_top": "12px",
            "actions": [
              {
                "type": "upvote",
                "icon": "arrow_up",
                "count": true,
                "style": {
                  "padding": "4px 8px",
                  "border_radius": "16px",
                  "background": "background_hover",
                  "hover_background": "background_input",
                  "active_color": "upvote"
                }
              },
              {
                "type": "downvote",
                "icon": "arrow_down",
                "active_color": "downvote"
              },
              {
                "type": "comments",
                "icon": "comment",
                "count": true
              },
              {
                "type": "share",
                "icon": "share"
              },
              {
                "type": "bookmark",
                "icon": "bookmark"
              }
            ],
            "action_style": {
              "padding": "6px 12px",
              "border_radius": "16px",
              "font_size": "13px",
              "font_weight": "500",
              "color": "text_secondary",
              "hover_background": "background_hover",
              "gap": "6px"
            }
          }
        }
      },
      "comment_section": {
        "background": "#FFFFFF",
        "border_radius": "12px",
        "padding": "24px",
        "elements": {
          "comment_input": {
            "background": "background_input",
            "border": "1px solid border",
            "border_radius": "8px",
            "padding": "16px",
            "placeholder": "Add comment...",
            "min_height": "80px",
            "focus_border": "1px solid primary",
            "toolbar": {
              "position": "bottom",
              "padding": "8px 0",
              "buttons": [
                "Bold (B)",
                "Italic (I)",
                "Underline (U)",
                "Divider",
                "Attach file",
                "Image",
                "Emoji",
                "Mention (@)"
              ],
              "button_style": {
                "size": "32px",
                "border_radius": "6px",
                "hover_background": "background_hover",
                "icon_size": "18px"
              },
              "submit_button": {
                "background": "primary",
                "color": "#FFFFFF",
                "border_radius": "20px",
                "padding": "8px 24px",
                "font_weight": "600",
                "position": "right",
                "hover_background": "primary_hover"
              }
            }
          },
          "comment_header": {
            "layout": "Flex row with space between",
            "left_section": {
              "title": "Comments",
              "font_size": "18px",
              "font_weight": "700",
              "badge": {
                "background": "primary",
                "color": "#FFFFFF",
                "border_radius": "12px",
                "padding": "2px 8px",
                "font_size": "12px",
                "font_weight": "600",
                "margin_left": "8px"
              }
            },
            "right_section": {
              "sort_dropdown": {
                "label": "Most recent",
                "icon": "arrow_down",
                "padding": "6px 12px",
                "border_radius": "6px",
                "hover_background": "background_hover"
              }
            }
          },
          "comment_item": {
            "padding": "16px 0",
            "border_left": "2px solid transparent",
            "layout": "Flex row",
            "elements": {
              "avatar": {
                "size": "36px",
                "border_radius": "50%",
                "margin_right": "12px"
              },
              "content_wrapper": {
                "flex": "1",
                "header": {
                  "username": {
                    "font_weight": "600",
                    "font_size": "14px",
                    "color": "text_primary"
                  },
                  "verified_badge": {
                    "icon": "checkmark_circle",
                    "color": "verified_badge",
                    "size": "16px",
                    "margin_left": "4px"
                  },
                  "timestamp": {
                    "font_size": "12px",
                    "color": "text_secondary",
                    "margin_left": "8px"
                  }
                },
                "body": {
                  "font_size": "14px",
                  "line_height": "1.6",
                  "color": "text_primary",
                  "margin_top": "8px",
                  "margin_bottom": "8px"
                },
                "actions": {
                  "layout": "Flex row with gap 16px",
                  "items": [
                    {
                      "type": "upvote",
                      "icon": "thumbs_up",
                      "count": true,
                      "active_color": "primary"
                    },
                    {
                      "type": "downvote",
                      "icon": "thumbs_down",
                      "count": true
                    },
                    {
                      "type": "reply",
                      "icon": "comment",
                      "label": "Reply"
                    },
                    {
                      "type": "more",
                      "icon": "three_dots"
                    }
                  ],
                  "action_style": {
                    "font_size": "13px",
                    "font_weight": "500",
                    "color": "text_secondary",
                    "padding": "4px 8px",
                    "border_radius": "4px",
                    "hover_background": "background_hover",
                    "gap": "4px"
                  }
                }
              }
            },
            "nested_style": {
              "margin_left": "48px",
              "border_left": "2px solid border_light",
              "padding_left": "16px"
            },
            "author_badge": {
              "background": "primary",
              "color": "#FFFFFF",
              "border_radius": "full",
              "size": "24px",
              "position": "replace_avatar"
            }
          }
        }
      },
      "right_sidebar": {
        "width": "320px",
        "padding": "16px",
        "elements": {
          "section_header": {
            "layout": "Flex row with space between",
            "title": {
              "font_size": "16px",
              "font_weight": "700",
              "color": "text_primary"
            },
            "clear_button": {
              "font_size": "13px",
              "color": "secondary",
              "font_weight": "500",
              "hover_underline": true
            }
          },
          "recent_post_card": {
            "background": "#FFFFFF",
            "border_radius": "8px",
            "padding": "12px",
            "margin_bottom": "12px",
            "border": "1px solid border",
            "hover_shadow": "0 2px 8px rgba(0,0,0,0.08)",
            "layout": "Flex row",
            "elements": {
              "content": {
                "flex": "1",
                "avatar": {
                  "size": "24px",
                  "border_radius": "50%",
                  "margin_bottom": "6px"
                },
                "username": {
                  "font_size": "12px",
                  "color": "text_secondary",
                  "prefix": "s/"
                },
                "title": {
                  "font_size": "14px",
                  "font_weight": "600",
                  "line_height": "1.4",
                  "margin_top": "4px",
                  "margin_bottom": "6px",
                  "color": "text_primary"
                },
                "meta": {
                  "font_size": "12px",
                  "color": "text_secondary"
                },
                "link": {
                  "font_size": "12px",
                  "color": "secondary",
                  "text_decoration": "none",
                  "hover_underline": true
                }
              },
              "thumbnail": {
                "width": "80px",
                "height": "80px",
                "border_radius": "6px",
                "object_fit": "cover",
                "margin_left": "12px"
              }
            }
          }
        }
      },
      "buttons": {
        "primary": {
          "background": "primary",
          "color": "#FFFFFF",
          "border_radius": "20px",
          "padding": "10px 24px",
          "font_weight": "600",
          "font_size": "14px",
          "border": "none",
          "hover_background": "primary_hover",
          "transition": "background 150ms ease"
        },
        "secondary": {
          "background": "transparent",
          "color": "primary",
          "border": "1px solid primary",
          "border_radius": "20px",
          "padding": "10px 24px",
          "font_weight": "600",
          "hover_background": "background_hover"
        },
        "text": {
          "background": "transparent",
          "color": "text_secondary",
          "border": "none",
          "padding": "8px 12px",
          "font_weight": "500",
          "hover_color": "text_primary",
          "hover_background": "background_hover"
        },
        "follow": {
          "background": "purple_accent",
          "color": "#FFFFFF",
          "border_radius": "20px",
          "padding": "6px 16px",
          "font_weight": "600",
          "font_size": "13px",
          "icon": "plus"
        }
      },
      "badges": {
        "count": {
          "background": "primary",
          "color": "#FFFFFF",
          "border_radius": "12px",
          "padding": "2px 8px",
          "font_size": "12px",
          "font_weight": "600"
        },
        "verified": {
          "icon": "checkmark_circle",
          "color": "verified_badge",
          "size": "16px"
        },
        "author": {
          "background": "primary",
          "color": "#FFFFFF",
          "size": "24px",
          "border_radius": "50%",
          "icon": "lightning"
        }
      },
      "avatars": {
        "sizes": {
          "small": "24px",
          "medium": "32px",
          "large": "36px",
          "xlarge": "40px"
        },
        "border_radius": "50%",
        "border": "none",
        "fallback_colors": ["#FF4500", "#0079D3", "#46D160", "#FFB000", "#FF6B35"]
      },
      "dividers": {
        "horizontal": {
          "height": "1px",
          "background": "border",
          "margin": "16px 0"
        }
      }
    },
    "interactions": {
      "hover_states": {
        "cards": "Subtle border color change and shadow lift",
        "buttons": "Background darkens slightly",
        "links": "Underline appears",
        "list_items": "Background color change to background_hover",
        "icon_buttons": "Background appears with background_hover color"
      },
      "active_states": {
        "upvote": "Orange color fill",
        "downvote": "Blue color fill",
        "navigation": "Background color with slight emphasis",
        "follow_button": "Text changes to 'Following' with checkmark"
      },
      "focus_states": {
        "inputs": "Border changes to primary color, outline appears",
        "buttons": "Subtle shadow and scale"
      },
      "transitions": {
        "default": "150ms ease-in-out",
        "hover": "100ms ease",
        "properties": ["background-color", "border-color", "color", "transform", "box-shadow", "opacity"]
      }
    },
    "iconography": {
      "style": "Outlined, rounded corners, modern",
      "default_size": "20px",
      "sizes": {
        "small": "16px",
        "medium": "20px",
        "large": "24px"
      },
      "stroke_width": "2px",
      "color": "Inherits or text_secondary"
    },
    "shadows": {
      "none": "none",
      "sm": "0 1px 3px rgba(0, 0, 0, 0.06)",
      "md": "0 2px 8px rgba(0, 0, 0, 0.08)",
      "lg": "0 4px 16px rgba(0, 0, 0, 0.12)",
      "hover": "0 2px 8px rgba(0, 0, 0, 0.1)"
    },
    "border_radius": {
      "sm": "4px",
      "md": "6px",
      "lg": "8px",
      "xl": "12px",
      "xxl": "16px",
      "pill": "20px",
      "full": "9999px"
    }
  }
}