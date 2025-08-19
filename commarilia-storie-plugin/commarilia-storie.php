<?php
/*
Plugin Name: ComMarília Stories
Description: Sistema de stories e notícias com player no estilo Web Story.
Version: 1.0.0
Author: OpenAI Assistant
*/

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ComMariliaStories {
    public function __construct() {
        add_action( 'init', [ $this, 'register_post_type' ] );
        add_action( 'add_meta_boxes', [ $this, 'register_meta_boxes' ] );
        add_action( 'save_post_commarilia_story', [ $this, 'save_meta' ] );
        add_shortcode( 'commarilia_stories', [ $this, 'render_shortcode' ] );
        add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_assets' ] );
    }

    public static function activate() {
        $self = new self();
        $self->register_post_type();
        flush_rewrite_rules();
        if ( ! get_posts( [ 'post_type' => 'commarilia_story', 'numberposts' => 1 ] ) ) {
            $self->insert_demo_content();
        }
    }

    public function register_post_type() {
        $labels = [
            'name' => 'Stories',
            'singular_name' => 'Story',
        ];
        $args = [
            'labels' => $labels,
            'public' => true,
            'show_in_rest' => true,
            'supports' => [ 'title' ],
            'has_archive' => false,
            'rewrite' => [ 'slug' => 'stories' ],
        ];
        register_post_type( 'commarilia_story', $args );
    }

    public function register_meta_boxes() {
        add_meta_box( 'commarilia_story_meta', 'Detalhes do Story', [ $this, 'meta_box_html' ], 'commarilia_story', 'normal', 'high' );
    }

    public function meta_box_html( $post ) {
        wp_nonce_field( 'commarilia_story_save', 'commarilia_story_nonce' );
        $category       = get_post_meta( $post->ID, '_cm_category', true );
        $category_color = get_post_meta( $post->ID, '_cm_category_color', true );
        $card_image     = get_post_meta( $post->ID, '_cm_card_image', true );
        $pages          = get_post_meta( $post->ID, '_cm_story_pages', true );
        $full           = get_post_meta( $post->ID, '_cm_fullcontent', true );
        $timestamp      = get_post_meta( $post->ID, '_cm_timestamp', true );
        if ( empty( $pages ) ) {
            $pages = [];
        }
        ?>
        <p>
            <label for="cm_category"><strong>Categoria</strong></label><br />
            <input type="text" name="cm_category" id="cm_category" value="<?php echo esc_attr( $category ); ?>" class="widefat" />
        </p>
        <p>
            <label for="cm_category_color"><strong>Cor da Categoria</strong></label><br />
            <input type="text" name="cm_category_color" id="cm_category_color" value="<?php echo esc_attr( $category_color ); ?>" class="widefat" placeholder="#2563eb" />
        </p>
        <p>
            <label for="cm_card_image"><strong>URL da Imagem do Card</strong></label><br />
            <input type="text" name="cm_card_image" id="cm_card_image" value="<?php echo esc_url( $card_image ); ?>" class="widefat" />
        </p>
        <p>
            <label for="cm_card_title"><strong>Título do Card</strong></label><br />
            <input type="text" name="cm_card_title" id="cm_card_title" value="<?php echo esc_attr( get_post_meta( $post->ID, '_cm_card_title', true ) ); ?>" class="widefat" />
        </p>
        <p>
            <label><strong>Páginas do Story</strong></label>
            <div id="cm-pages">
                <?php foreach ( $pages as $index => $page ) : ?>
                    <div class="cm-page" style="margin-bottom:10px;border:1px solid #ddd;padding:10px;">
                        <label>URL da Mídia<br /><input type="text" name="cm_pages[<?php echo $index; ?>][media_url]" value="<?php echo esc_url( $page['media_url'] ?? '' ); ?>" class="widefat" /></label>
                        <label>Texto<br /><textarea name="cm_pages[<?php echo $index; ?>][text]" class="widefat"><?php echo esc_textarea( $page['text'] ?? '' ); ?></textarea></label>
                        <label><input type="checkbox" name="cm_pages[<?php echo $index; ?>][show_link]" <?php checked( ! empty( $page['show_link'] ) ); ?> /> Mostrar link para Matéria</label>
                    </div>
                <?php endforeach; ?>
            </div>
            <button type="button" class="button" id="cm-add-page">Adicionar página</button>
        </p>
        <p>
            <label for="cm_full_title"><strong>Título da Matéria Completa</strong></label><br />
            <input type="text" name="cm_full[title]" id="cm_full_title" value="<?php echo esc_attr( $full['title'] ?? '' ); ?>" class="widefat" />
        </p>
        <p>
            <label for="cm_full_image"><strong>Imagem da Matéria Completa</strong></label><br />
            <input type="text" name="cm_full[image]" id="cm_full_image" value="<?php echo esc_url( $full['image'] ?? '' ); ?>" class="widefat" />
        </p>
        <p>
            <label for="cm_full_body"><strong>Conteúdo da Matéria</strong></label><br />
            <textarea name="cm_full[body]" id="cm_full_body" class="widefat" rows="6"><?php echo esc_textarea( $full['body'] ?? '' ); ?></textarea>
        </p>
        <p>
            <label for="cm_timestamp"><strong>Data de Publicação</strong></label><br />
            <input type="datetime-local" name="cm_timestamp" id="cm_timestamp" value="<?php echo esc_attr( $timestamp ? date( 'Y-m-d\TH:i', strtotime( $timestamp ) ) : '' ); ?>" />
        </p>
        <script>
        document.getElementById('cm-add-page')?.addEventListener('click', function(){
            const container = document.getElementById('cm-pages');
            const index = container.children.length;
            const div = document.createElement('div');
            div.className = 'cm-page';
            div.style.marginBottom = '10px';
            div.style.border = '1px solid #ddd';
            div.style.padding = '10px';
            div.innerHTML = '<label>URL da Mídia<br /><input type="text" name="cm_pages['+index+'][media_url]" class="widefat" /></label>'+
                            '<label>Texto<br /><textarea name="cm_pages['+index+'][text]" class="widefat"></textarea></label>'+
                            '<label><input type="checkbox" name="cm_pages['+index+'][show_link]" /> Mostrar link para Matéria</label>';
            container.appendChild(div);
        });
        </script>
        <?php
    }

    public function save_meta( $post_id ) {
        if ( ! isset( $_POST['commarilia_story_nonce'] ) || ! wp_verify_nonce( $_POST['commarilia_story_nonce'], 'commarilia_story_save' ) ) {
            return;
        }
        if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
            return;
        }
        update_post_meta( $post_id, '_cm_category', sanitize_text_field( $_POST['cm_category'] ?? '' ) );
        update_post_meta( $post_id, '_cm_category_color', sanitize_text_field( $_POST['cm_category_color'] ?? '' ) );
        update_post_meta( $post_id, '_cm_card_image', esc_url_raw( $_POST['cm_card_image'] ?? '' ) );
        update_post_meta( $post_id, '_cm_card_title', sanitize_text_field( $_POST['cm_card_title'] ?? '' ) );
        $pages = [];
        if ( isset( $_POST['cm_pages'] ) && is_array( $_POST['cm_pages'] ) ) {
            foreach ( $_POST['cm_pages'] as $page ) {
                if ( empty( $page['media_url'] ) ) {
                    continue;
                }
                $pages[] = [
                    'media_url' => esc_url_raw( $page['media_url'] ),
                    'media_type' => strtolower( pathinfo( $page['media_url'], PATHINFO_EXTENSION ) ) === 'mp4' ? 'video' : 'image',
                    'text' => sanitize_text_field( $page['text'] ?? '' ),
                    'show_link' => ! empty( $page['show_link'] ),
                ];
            }
        }
        update_post_meta( $post_id, '_cm_story_pages', $pages );
        $full = $_POST['cm_full'] ?? [];
        $full_sanitized = [
            'title' => sanitize_text_field( $full['title'] ?? '' ),
            'image' => esc_url_raw( $full['image'] ?? '' ),
            'body'  => wp_kses_post( $full['body'] ?? '' ),
        ];
        update_post_meta( $post_id, '_cm_fullcontent', $full_sanitized );
        $timestamp = $_POST['cm_timestamp'] ?? '';
        if ( $timestamp ) {
            update_post_meta( $post_id, '_cm_timestamp', gmdate( 'c', strtotime( $timestamp ) ) );
        }
    }

    public function enqueue_assets() {
        if ( ! is_singular() ) {
            return;
        }
        $post = get_post();
        if ( ! $post || ! has_shortcode( $post->post_content, 'commarilia_stories' ) ) {
            return;
        }
        wp_enqueue_script( 'tailwindcss', 'https://cdn.tailwindcss.com', [], null, false );
        wp_enqueue_script( 'feather-icons', 'https://unpkg.com/feather-icons', [], null, true );
        wp_enqueue_style( 'commarilia-storie-style', plugin_dir_url( __FILE__ ) . 'assets/css/style.css', [], '1.0.0' );
        wp_enqueue_script( 'commarilia-storie-script', plugin_dir_url( __FILE__ ) . 'assets/js/story.js', [ 'feather-icons' ], '1.0.0', true );
        wp_localize_script( 'commarilia-storie-script', 'commariliaStories', $this->get_stories_data() );
    }

    public function get_stories_data() {
        $posts = get_posts( [ 'post_type' => 'commarilia_story', 'post_status' => 'publish', 'numberposts' => -1, 'orderby' => 'date', 'order' => 'DESC' ] );
        $data = [];
        foreach ( $posts as $post ) {
            $data[] = [
                'id' => $post->ID,
                'category' => get_post_meta( $post->ID, '_cm_category', true ),
                'categorycolor' => get_post_meta( $post->ID, '_cm_category_color', true ),
                'cardtitle' => get_post_meta( $post->ID, '_cm_card_title', true ) ?: $post->post_title,
                'cardimage' => get_post_meta( $post->ID, '_cm_card_image', true ),
                'timestamp' => get_post_meta( $post->ID, '_cm_timestamp', true ),
                'pages' => get_post_meta( $post->ID, '_cm_story_pages', true ),
                'fullcontent' => get_post_meta( $post->ID, '_cm_fullcontent', true ),
            ];
        }
        return $data;
    }

    public function render_shortcode() {
        ob_start();
        include plugin_dir_path( __FILE__ ) . 'templates/stories-grid.php';
        return ob_get_clean();
    }

    private function insert_demo_content() {
        $demo_posts = [
            [
                'category' => 'TECNOLOGIA',
                'categorycolor' => '#2563eb',
                'cardtitle' => 'Lançamento de novo smartphone',
                'cardimage' => 'https://picsum.photos/seed/tech/800/600',
                'pages' => [
                    [ 'media_url' => 'https://picsum.photos/seed/tech1/800/600', 'media_type' => 'image', 'text' => 'Novidades do aparelho', 'show_link' => true ],
                    [ 'media_url' => 'https://picsum.photos/seed/tech2/800/600', 'media_type' => 'image', 'text' => 'Design impressionante', 'show_link' => true ],
                ],
                'fullcontent' => [
                    'title' => 'Lançamento de novo smartphone',
                    'image' => 'https://picsum.photos/seed/tech/800/600',
                    'body'  => '<p>Detalhes completos da notícia sobre o lançamento do novo smartphone.</p>',
                ],
            ],
            [
                'category' => 'ESPORTE',
                'categorycolor' => '#e11d48',
                'cardtitle' => 'Equipe vence campeonato',
                'cardimage' => 'https://picsum.photos/seed/sports/800/600',
                'pages' => [
                    [ 'media_url' => 'https://picsum.photos/seed/sports1/800/600', 'media_type' => 'image', 'text' => 'Celebrando a vitória', 'show_link' => true ],
                    [ 'media_url' => 'https://picsum.photos/seed/sports2/800/600', 'media_type' => 'image', 'text' => 'Melhores momentos', 'show_link' => true ],
                ],
                'fullcontent' => [
                    'title' => 'Equipe vence campeonato',
                    'image' => 'https://picsum.photos/seed/sports/800/600',
                    'body'  => '<p>Resumo do jogo e detalhes da vitória da equipe.</p>',
                ],
            ],
        ];
        foreach ( $demo_posts as $demo ) {
            $post_id = wp_insert_post( [
                'post_type' => 'commarilia_story',
                'post_status' => 'publish',
                'post_title' => $demo['cardtitle'],
            ] );
            if ( $post_id ) {
                update_post_meta( $post_id, '_cm_category', $demo['category'] );
                update_post_meta( $post_id, '_cm_category_color', $demo['categorycolor'] );
                update_post_meta( $post_id, '_cm_card_image', $demo['cardimage'] );
                update_post_meta( $post_id, '_cm_card_title', $demo['cardtitle'] );
                update_post_meta( $post_id, '_cm_story_pages', $demo['pages'] );
                update_post_meta( $post_id, '_cm_fullcontent', $demo['fullcontent'] );
                update_post_meta( $post_id, '_cm_timestamp', current_time( 'c' ) );
            }
        }
    }
}

register_activation_hook( __FILE__, [ 'ComMariliaStories', 'activate' ] );
new ComMariliaStories();

?>
