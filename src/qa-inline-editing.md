---
layout: pages/sections.njk
bodyClasses: sections-page
seo:
  title: 'QA: Inline editing'
  description: >-
    Nested-item sections with realistic, distinct values, for verifying
    inline editing on the rendered page. The all-sections QA page reuses the
    same placeholder strings everywhere, which the inline annotator rightly
    refuses to tag (ambiguous values tag nothing), so it can't exercise this.
sections:
  - sectionType: slider
    containerTag: section
    id: ''
    classes: ''
    config: ''
    text:
      leadIn: ''
      title: ''
      titleTag: h2
      isCentered: false
      subTitle: ''
      prose: ''
    slides:
      - image:
          src: /assets/images/sample3.jpg
          alt: A misty forest
          caption: Morning fog in the valley
          url: ''
        text:
          leadIn: From the field
          title: Forest expedition
          titleTag: h3
          isCentered: false
          subTitle: Three days off the grid
          prose: |-
            We followed the ridge trail until the **fog lifted**.
        ctas:
          - url: '#forest'
            label: Read the trip log
            isButton: true
            buttonStyle: primary
            isSmall: false
        slideClasses: ''
      - image:
          src: /assets/images/sample4.jpg
          alt: A rocky coastline
          caption: Low tide at the point
          url: ''
        text:
          leadIn: From the archive
          title: Coastal survey
          titleTag: h3
          isCentered: false
          subTitle: Mapping the shoreline
          prose: |-
            The tide pools held more species than **last year's count**.
        ctas:
          - url: '#coast'
            label: See the results
            isButton: true
            buttonStyle: primary
            isSmall: false
        slideClasses: ''
    isDisabled: false
    containerFields:
      inContainer: true
      isAnimated: false
      noMargin:
        top: false
        bottom: false
      noPadding:
        top: false
        bottom: false
      background:
        color: ''
        image: ''
        imageScreen: none
        isDark: false
  - sectionType: stats
    containerTag: section
    id: ''
    classes: ''
    text:
      leadIn: By the numbers
      title: A year of fieldwork
      titleTag: h2
      isCentered: false
      subTitle: What the team logged in 2025
      prose: ''
    stats:
      layout: grid
      items:
        - icon: activity
          value: '128'
          label: Site visits
          description: Field surveys completed across all regions
        - icon: award
          value: '97%'
          label: Samples archived
          description: Specimens catalogued within one week
        - icon: anchor
          value: '14'
          label: New locations
          description: Sites added to the long-term study
    isDisabled: false
    containerFields:
      inContainer: true
      isAnimated: false
      noMargin:
        top: false
        bottom: false
      noPadding:
        top: false
        bottom: false
      background:
        color: ''
        image: ''
        imageScreen: none
        isDark: false
  - sectionType: steps
    containerTag: section
    id: ''
    classes: ''
    text:
      leadIn: ''
      title: How a survey works
      titleTag: h2
      isCentered: false
      subTitle: ''
      prose: ''
    steps:
      layout: horizontal
      showNumbers: true
      items:
        - icon: ''
          title: Scout the site
          description: Walk the perimeter and note access points
        - icon: ''
          title: Set the grid
          description: Stake out transects at ten-meter intervals
        - icon: ''
          title: Record findings
          description: Photograph and log every specimen in place
    isDisabled: false
    containerFields:
      inContainer: true
      isAnimated: false
      noMargin:
        top: false
        bottom: false
      noPadding:
        top: false
        bottom: false
      background:
        color: ''
        image: ''
        imageScreen: none
        isDark: false
  - sectionType: timeline
    containerTag: section
    id: ''
    classes: ''
    text:
      leadIn: ''
      title: Project milestones
      titleTag: h2
      isCentered: false
      subTitle: ''
      prose: ''
    timeline:
      layout: vertical
      alternating: true
      events:
        - icon: ''
          year: '2023'
          title: Pilot season
          description: First two sites established with volunteer crews
        - icon: ''
          year: '2024'
          title: Full funding
          description: Grant awarded and equipment purchased
        - icon: ''
          year: '2025'
          title: Regional expansion
          description: Fourteen new sites across three watersheds
    isDisabled: false
    containerFields:
      inContainer: true
      isAnimated: false
      noMargin:
        top: false
        bottom: false
      noPadding:
        top: false
        bottom: false
      background:
        color: ''
        image: ''
        imageScreen: none
        isDark: false
  - sectionType: flip-cards
    containerTag: section
    id: ''
    classes: ''
    text:
      leadIn: ''
      title: ''
      titleTag: h2
      isCentered: false
      subTitle: ''
      prose: ''
    cards:
      - front:
          icon: map
          url: ''
          text:
            leadIn: ''
            title: Where we work
            titleTag: h3
            isCentered: false
            subTitle: ''
            prose: ''
          ctas: []
        back:
          text:
            leadIn: ''
            title: Twelve watersheds
            titleTag: h3
            isCentered: false
            subTitle: ''
            prose: |-
              From the headwaters to the estuary, every site is visited monthly.
          ctas: []
      - front:
          icon: users
          url: ''
          text:
            leadIn: ''
            title: Who takes part
            titleTag: h3
            isCentered: false
            subTitle: ''
            prose: ''
          ctas: []
        back:
          text:
            leadIn: ''
            title: Ninety volunteers
            titleTag: h3
            isCentered: false
            subTitle: ''
            prose: |-
              Trained community scientists collect and verify every record.
          ctas: []
    isDisabled: false
    containerFields:
      inContainer: true
      isAnimated: false
      noMargin:
        top: false
        bottom: false
      noPadding:
        top: false
        bottom: false
      background:
        color: ''
        image: ''
        imageScreen: none
        isDark: false
  - sectionType: testimonial
    containerTag: section
    id: ''
    classes: ''
    isReverse: false
    quote:
      text: The field guides this project produced are the best resource our rangers have ever had.
      cite: ''
    quotee:
      portrait:
        src: /assets/images/sample5.jpg
        alt: Portrait of Dana Reyes
        caption: ''
        url: ''
      name: Dana Reyes
      title: Chief Ranger
      company: Basin Parks District
      logo: ''
    isDisabled: false
    containerFields:
      inContainer: true
      isAnimated: false
      noMargin:
        top: false
        bottom: false
      noPadding:
        top: false
        bottom: false
      background:
        color: ''
        image: ''
        imageScreen: none
        isDark: false
  - sectionType: hero-slider
    containerTag: section
    id: ''
    classes: ''
    autoplay: false
    autoPlayDelay: 5000
    slides:
      - isReverse: false
        text:
          leadIn: Season opener
          title: The river year begins
          titleTag: h2
          isCentered: false
          subTitle: Snowmelt arrives early
          prose: |-
            Gauges upstream are already reading **above the ten-year median**.
        image:
          src: ''
          alt: ''
          caption: ''
          url: ''
        ctas:
          - url: '#river'
            label: Follow the gauges
            isButton: true
            buttonStyle: primary
            isSmall: false
        background:
          image:
            src: /assets/images/sample6.jpg
            alt: A river in spring
            caption: ''
            url: ''
          video:
            id: ''
            src: ''
            tn: ''
            alt: ''
            cloudname: ''
            start: ''
            end: ''
            inSitu: false
          color: ''
          imageScreen: light
          isDark: false
      - isReverse: false
        text:
          leadIn: Community day
          title: Volunteers wanted
          titleTag: h2
          isCentered: false
          subTitle: Training starts in May
          prose: |-
            No experience needed; every crew pairs newcomers with veterans.
        image:
          src: ''
          alt: ''
          caption: ''
          url: ''
        ctas:
          - url: '#join'
            label: Sign up today
            isButton: true
            buttonStyle: primary
            isSmall: false
        background:
          image:
            src: /assets/images/sample7.jpg
            alt: Volunteers at work
            caption: ''
            url: ''
          video:
            id: ''
            src: ''
            tn: ''
            alt: ''
            cloudname: ''
            start: ''
            end: ''
            inSitu: false
          color: ''
          imageScreen: light
          isDark: false
    isDisabled: false
    containerFields:
      inContainer: false
      isAnimated: false
      noMargin:
        top: false
        bottom: false
      noPadding:
        top: false
        bottom: false
      background:
        color: ''
        image: ''
        imageScreen: none
        isDark: false
  - sectionType: columns
    containerTag: section
    id: ''
    classes: ''
    columnsDirection: ''
    contentClasses: ''
    columns:
      - columnClasses: ''
        blocks:
          - text:
              leadIn: ''
              title: Open data
              titleTag: h3
              isCentered: false
              subTitle: ''
              prose: |-
                Every observation is published within a month of collection.
      - columnClasses: ''
        blocks:
          - text:
              leadIn: ''
              title: Open methods
              titleTag: h3
              isCentered: false
              subTitle: ''
              prose: |-
                Protocols are versioned and reviewed by the science board.
    isDisabled: false
    containerFields:
      inContainer: true
      isAnimated: false
      noMargin:
        top: false
        bottom: false
      noPadding:
        top: false
        bottom: false
      background:
        color: ''
        image: ''
        imageScreen: none
        isDark: false
---
